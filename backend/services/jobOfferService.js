// Job Offer Service for UC-127: Offer Evaluation & Comparison Tool
import db from "./database.js";

class JobOfferService {
  // ============================================================================
  // CREATE
  // ============================================================================

  async createJobOffer(userId, offerData) {
    const client = await db.getClient();
    try {
      // Calculate totals before inserting
      const calculations = this.calculateOfferMetrics(offerData);

      const query = `
        INSERT INTO job_offers (
          user_id, job_opportunity_id, interview_id,
          company, position_title, offer_date, decision_deadline,
          base_salary, signing_bonus, annual_bonus, bonus_percentage, performance_bonus_max,
          equity_type, equity_amount, equity_vesting_schedule, equity_vesting_years, equity_cliff_months,
          health_insurance_monthly_value, health_insurance_coverage, dental_insurance, vision_insurance,
          life_insurance, disability_insurance, retirement_401k_match_percentage, retirement_401k_match_max,
          hsa_contribution, pto_days, sick_days, holidays, parental_leave_weeks,
          relocation_assistance, tuition_reimbursement, professional_development_budget,
          gym_membership, commuter_benefits, meal_stipend, remote_work_stipend,
          location, remote_policy, remote_days_per_week, required_office_days, timezone,
          col_index, col_adjusted_salary,
          culture_fit_score, growth_opportunities_score, work_life_balance_score,
          team_quality_score, management_quality_score, tech_stack_score,
          company_stability_score, learning_opportunities_score,
          total_cash_compensation, total_compensation_year_1, total_compensation_annual_avg,
          benefits_value_annual, overall_score, financial_score, non_financial_score,
          negotiation_status, negotiation_notes, offer_status, notes, offer_letter_url
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
          $61, $62, $63, $64
        )
        RETURNING *
      `;

      const values = [
        userId,
        offerData.job_opportunity_id || null,
        offerData.interview_id || null,
        offerData.company,
        offerData.position_title,
        offerData.offer_date || new Date(),
        offerData.decision_deadline || null,
        offerData.base_salary,
        offerData.signing_bonus || 0,
        offerData.annual_bonus || 0,
        offerData.bonus_percentage || null,
        offerData.performance_bonus_max || 0,
        offerData.equity_type || null,
        offerData.equity_amount || 0,
        offerData.equity_vesting_schedule || null,
        offerData.equity_vesting_years || 4,
        offerData.equity_cliff_months || 12,
        offerData.health_insurance_monthly_value || 0,
        offerData.health_insurance_coverage || "None",
        offerData.dental_insurance || false,
        offerData.vision_insurance || false,
        offerData.life_insurance || false,
        offerData.disability_insurance || false,
        offerData.retirement_401k_match_percentage || 0,
        offerData.retirement_401k_match_max || 0,
        offerData.hsa_contribution || 0,
        offerData.pto_days || 0,
        offerData.sick_days || 0,
        offerData.holidays || 0,
        offerData.parental_leave_weeks || 0,
        offerData.relocation_assistance || 0,
        offerData.tuition_reimbursement || 0,
        offerData.professional_development_budget || 0,
        offerData.gym_membership || false,
        offerData.commuter_benefits || 0,
        offerData.meal_stipend || 0,
        offerData.remote_work_stipend || 0,
        offerData.location,
        offerData.remote_policy || null,
        offerData.remote_days_per_week || null,
        offerData.required_office_days || null,
        offerData.timezone || null,
        offerData.col_index || 100,
        calculations.col_adjusted_salary,
        offerData.culture_fit_score || null,
        offerData.growth_opportunities_score || null,
        offerData.work_life_balance_score || null,
        offerData.team_quality_score || null,
        offerData.management_quality_score || null,
        offerData.tech_stack_score || null,
        offerData.company_stability_score || null,
        offerData.learning_opportunities_score || null,
        calculations.total_cash_compensation,
        calculations.total_compensation_year_1,
        calculations.total_compensation_annual_avg,
        calculations.benefits_value_annual,
        calculations.overall_score,
        calculations.financial_score,
        calculations.non_financial_score,
        offerData.negotiation_status || "received",
        offerData.negotiation_notes || null,
        offerData.offer_status || "active",
        offerData.notes || null,
        offerData.offer_letter_url || null,
      ];

      const result = await client.query(query, values);
      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error creating job offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // READ
  // ============================================================================

  async getJobOfferById(offerId, userId) {
    const client = await db.getClient();
    try {
      const query = `
        SELECT jo.*, 
               j.title as job_title, j.company as job_company,
               i.interview_type, i.scheduled_at as interview_date
        FROM job_offers jo
        LEFT JOIN job_opportunities j ON jo.job_opportunity_id = j.id
        LEFT JOIN interviews i ON jo.interview_id = i.id
        WHERE jo.id = $1 AND jo.user_id = $2
      `;
      const result = await client.query(query, [offerId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error getting job offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getJobOffersByUserId(userId, filters = {}) {
    const client = await db.getClient();
    try {
      let query = `
        SELECT jo.*, 
               j.title as job_title, j.company as job_company,
               i.interview_type, i.scheduled_at as interview_date
        FROM job_offers jo
        LEFT JOIN job_opportunities j ON jo.job_opportunity_id = j.id
        LEFT JOIN interviews i ON jo.interview_id = i.id
        WHERE jo.user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.offer_status) {
        query += ` AND jo.offer_status = $${paramIndex}`;
        params.push(filters.offer_status);
        paramIndex++;
      }

      if (filters.negotiation_status) {
        query += ` AND jo.negotiation_status = $${paramIndex}`;
        params.push(filters.negotiation_status);
        paramIndex++;
      }

      if (filters.company) {
        query += ` AND LOWER(jo.company) LIKE $${paramIndex}`;
        params.push(`%${filters.company.toLowerCase()}%`);
        paramIndex++;
      }

      query += ` ORDER BY jo.created_at DESC`;

      const result = await client.query(query, params);
      return result.rows.map((row) => this.formatJobOffer(row));
    } catch (error) {
      console.error("Error getting job offers:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  async updateJobOffer(offerId, userId, updateData) {
    const client = await db.getClient();
    try {
      // First get the current offer
      const current = await this.getJobOfferById(offerId, userId);
      if (!current) {
        throw new Error("Job offer not found");
      }

      // Merge current data with updates
      const mergedData = { ...current, ...updateData };
      
      // Recalculate metrics
      const calculations = this.calculateOfferMetrics(mergedData);

      const query = `
        UPDATE job_offers SET
          job_opportunity_id = $1,
          interview_id = $2,
          company = $3,
          position_title = $4,
          offer_date = $5,
          decision_deadline = $6,
          base_salary = $7,
          signing_bonus = $8,
          annual_bonus = $9,
          bonus_percentage = $10,
          performance_bonus_max = $11,
          equity_type = $12,
          equity_amount = $13,
          equity_vesting_schedule = $14,
          equity_vesting_years = $15,
          equity_cliff_months = $16,
          health_insurance_monthly_value = $17,
          health_insurance_coverage = $18,
          dental_insurance = $19,
          vision_insurance = $20,
          life_insurance = $21,
          disability_insurance = $22,
          retirement_401k_match_percentage = $23,
          retirement_401k_match_max = $24,
          hsa_contribution = $25,
          pto_days = $26,
          sick_days = $27,
          holidays = $28,
          parental_leave_weeks = $29,
          relocation_assistance = $30,
          tuition_reimbursement = $31,
          professional_development_budget = $32,
          gym_membership = $33,
          commuter_benefits = $34,
          meal_stipend = $35,
          remote_work_stipend = $36,
          location = $37,
          remote_policy = $38,
          remote_days_per_week = $39,
          required_office_days = $40,
          timezone = $41,
          col_index = $42,
          col_adjusted_salary = $43,
          culture_fit_score = $44,
          growth_opportunities_score = $45,
          work_life_balance_score = $46,
          team_quality_score = $47,
          management_quality_score = $48,
          tech_stack_score = $49,
          company_stability_score = $50,
          learning_opportunities_score = $51,
          total_cash_compensation = $52,
          total_compensation_year_1 = $53,
          total_compensation_annual_avg = $54,
          benefits_value_annual = $55,
          overall_score = $56,
          financial_score = $57,
          non_financial_score = $58,
          negotiation_status = $59,
          negotiation_notes = $60,
          offer_status = $61,
          notes = $62,
          offer_letter_url = $63,
          updated_at = NOW()
        WHERE id = $64 AND user_id = $65
        RETURNING *
      `;

      const values = [
        mergedData.job_opportunity_id || null,
        mergedData.interview_id || null,
        mergedData.company,
        mergedData.position_title,
        mergedData.offer_date,
        mergedData.decision_deadline || null,
        mergedData.base_salary,
        mergedData.signing_bonus || 0,
        mergedData.annual_bonus || 0,
        mergedData.bonus_percentage || null,
        mergedData.performance_bonus_max || 0,
        mergedData.equity_type || null,
        mergedData.equity_amount || 0,
        mergedData.equity_vesting_schedule || null,
        mergedData.equity_vesting_years || 4,
        mergedData.equity_cliff_months || 12,
        mergedData.health_insurance_monthly_value || 0,
        mergedData.health_insurance_coverage || "None",
        mergedData.dental_insurance || false,
        mergedData.vision_insurance || false,
        mergedData.life_insurance || false,
        mergedData.disability_insurance || false,
        mergedData.retirement_401k_match_percentage || 0,
        mergedData.retirement_401k_match_max || 0,
        mergedData.hsa_contribution || 0,
        mergedData.pto_days || 0,
        mergedData.sick_days || 0,
        mergedData.holidays || 0,
        mergedData.parental_leave_weeks || 0,
        mergedData.relocation_assistance || 0,
        mergedData.tuition_reimbursement || 0,
        mergedData.professional_development_budget || 0,
        mergedData.gym_membership || false,
        mergedData.commuter_benefits || 0,
        mergedData.meal_stipend || 0,
        mergedData.remote_work_stipend || 0,
        mergedData.location,
        mergedData.remote_policy || null,
        mergedData.remote_days_per_week || null,
        mergedData.required_office_days || null,
        mergedData.timezone || null,
        mergedData.col_index || 100,
        calculations.col_adjusted_salary,
        mergedData.culture_fit_score || null,
        mergedData.growth_opportunities_score || null,
        mergedData.work_life_balance_score || null,
        mergedData.team_quality_score || null,
        mergedData.management_quality_score || null,
        mergedData.tech_stack_score || null,
        mergedData.company_stability_score || null,
        mergedData.learning_opportunities_score || null,
        calculations.total_cash_compensation,
        calculations.total_compensation_year_1,
        calculations.total_compensation_annual_avg,
        calculations.benefits_value_annual,
        calculations.overall_score,
        calculations.financial_score,
        calculations.non_financial_score,
        mergedData.negotiation_status || "received",
        mergedData.negotiation_notes || null,
        mergedData.offer_status || "active",
        mergedData.notes || null,
        mergedData.offer_letter_url || null,
        offerId,
        userId,
      ];

      const result = await client.query(query, values);
      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error updating job offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // DELETE
  // ============================================================================

  async deleteJobOffer(offerId, userId) {
    const client = await db.getClient();
    try {
      const query = `
        DELETE FROM job_offers 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      const result = await client.query(query, [offerId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Error deleting job offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // OFFER ACTIONS
  // ============================================================================

  async acceptOffer(offerId, userId) {
    const client = await db.getClient();
    try {
      const query = `
        UPDATE job_offers 
        SET offer_status = 'accepted',
            negotiation_status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await client.query(query, [offerId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error("Job offer not found");
      }

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error accepting offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async declineOffer(offerId, userId, reason = null) {
    const client = await db.getClient();
    try {
      const query = `
        UPDATE job_offers 
        SET offer_status = 'declined',
            negotiation_status = 'declined',
            declined_at = NOW(),
            decline_reason = $3,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      const result = await client.query(query, [offerId, userId, reason]);
      
      if (result.rows.length === 0) {
        throw new Error("Job offer not found");
      }

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error declining offer:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // SCENARIO ANALYSIS
  // ============================================================================

  async addScenario(offerId, userId, scenario) {
    const client = await db.getClient();
    try {
      // Get current offer
      const offer = await this.getJobOfferById(offerId, userId);
      if (!offer) {
        throw new Error("Job offer not found");
      }

      // Apply scenario adjustments
      const scenarioData = { ...offer, ...scenario.adjustments };
      const calculations = this.calculateOfferMetrics(scenarioData);

      // Add scenario with calculations
      const newScenario = {
        id: scenario.id || `scenario_${Date.now()}`,
        name: scenario.name,
        description: scenario.description,
        adjustments: scenario.adjustments,
        calculated_values: calculations,
        created_at: new Date().toISOString(),
      };

      // Update scenarios array
      const currentScenarios = offer.scenarios || [];
      currentScenarios.push(newScenario);

      const query = `
        UPDATE job_offers 
        SET scenarios = $1,
            updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [
        JSON.stringify(currentScenarios),
        offerId,
        userId,
      ]);

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error adding scenario:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteScenario(offerId, userId, scenarioId) {
    const client = await db.getClient();
    try {
      const offer = await this.getJobOfferById(offerId, userId);
      if (!offer) {
        throw new Error("Job offer not found");
      }

      const scenarios = (offer.scenarios || []).filter(
        (s) => s.id !== scenarioId
      );

      const query = `
        UPDATE job_offers 
        SET scenarios = $1,
            updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [
        JSON.stringify(scenarios),
        offerId,
        userId,
      ]);

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error deleting scenario:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // NEGOTIATION
  // ============================================================================

  async addNegotiationEntry(offerId, userId, entry) {
    const client = await db.getClient();
    try {
      const offer = await this.getJobOfferById(offerId, userId);
      if (!offer) {
        throw new Error("Job offer not found");
      }

      const history = offer.negotiation_history || [];
      history.push({
        ...entry,
        date: entry.date || new Date().toISOString(),
      });

      const query = `
        UPDATE job_offers 
        SET negotiation_history = $1,
            negotiation_status = 'negotiating',
            updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [
        JSON.stringify(history),
        offerId,
        userId,
      ]);

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error adding negotiation entry:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateNegotiationRecommendations(offerId, userId) {
    const client = await db.getClient();
    try {
      const offer = await this.getJobOfferById(offerId, userId);
      if (!offer) {
        throw new Error("Job offer not found");
      }

      // Generate recommendations based on offer data
      const recommendations = [];

      // Salary recommendation
      if (offer.base_salary < 100000) {
        recommendations.push({
          category: "salary",
          recommendation: "Request base salary increase",
          rationale:
            "Based on market data for similar positions, there's room for negotiation.",
          priority: "high",
          suggested_ask: Math.round(offer.base_salary * 1.1),
        });
      }

      // Equity recommendation
      if (!offer.equity_amount || offer.equity_amount === 0) {
        recommendations.push({
          category: "equity",
          recommendation: "Request equity compensation",
          rationale:
            "Equity is a standard part of compensation packages in tech.",
          priority: "high",
        });
      }

      // PTO recommendation
      if (offer.pto_days < 20) {
        recommendations.push({
          category: "benefits",
          recommendation: "Negotiate for additional PTO days",
          rationale: "Industry standard is 15-25 days of PTO.",
          priority: "medium",
        });
      }

      // Remote work recommendation
      if (offer.remote_policy === "On-site") {
        recommendations.push({
          category: "remote",
          recommendation: "Negotiate hybrid work arrangement",
          rationale: "Flexible work arrangements improve work-life balance.",
          priority: "medium",
        });
      }

      const query = `
        UPDATE job_offers 
        SET negotiation_recommendations = $1,
            updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await client.query(query, [
        JSON.stringify(recommendations),
        offerId,
        userId,
      ]);

      return this.formatJobOffer(result.rows[0]);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // COMPARISON
  // ============================================================================

  async compareOffers(userId, offerIds, weights = null) {
    const client = await db.getClient();
    try {
      // Default weights
      const defaultWeights = {
        financial: 0.4,
        culture_fit: 0.1,
        growth_opportunities: 0.1,
        work_life_balance: 0.1,
        team_quality: 0.05,
        management_quality: 0.05,
        tech_stack: 0.05,
        company_stability: 0.05,
        learning_opportunities: 0.05,
        location: 0.025,
        remote_policy: 0.025,
      };

      const finalWeights = weights || defaultWeights;

      // Get all offers
      const offers = await Promise.all(
        offerIds.map((id) => this.getJobOfferById(id, userId))
      );

      const validOffers = offers.filter((o) => o !== null);

      if (validOffers.length === 0) {
        throw new Error("No valid offers found");
      }

      // Recalculate scores with custom weights
      const offersWithScores = validOffers.map((offer) => {
        const scores = this.calculateWeightedScores(offer, finalWeights);
        return { ...offer, ...scores };
      });

      // Build comparison matrix
      const matrix = this.buildComparisonMatrix(offersWithScores);

      // Generate recommendations
      const recommendations = this.generateComparisonRecommendations(
        offersWithScores
      );

      return {
        offers: offersWithScores,
        comparison_matrix: matrix,
        recommendations,
        weights: finalWeights,
      };
    } catch (error) {
      console.error("Error comparing offers:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  calculateOfferMetrics(offerData) {
    const baseSalary = parseFloat(offerData.base_salary) || 0;
    const signingBonus = parseFloat(offerData.signing_bonus) || 0;
    const annualBonus = parseFloat(offerData.annual_bonus) || 0;
    const equityAmount = parseFloat(offerData.equity_amount) || 0;
    const vestingYears = parseInt(offerData.equity_vesting_years) || 4;
    const colIndex = parseFloat(offerData.col_index) || 100;

    // Total cash compensation (excluding equity)
    const total_cash_compensation = baseSalary + signingBonus + annualBonus;

    // Calculate benefits value
    const healthInsuranceAnnual =
      (parseFloat(offerData.health_insurance_monthly_value) || 0) * 12;
    const match401kAnnual =
      Math.min(
        baseSalary *
          ((parseFloat(offerData.retirement_401k_match_percentage) || 0) /
            100),
        parseFloat(offerData.retirement_401k_match_max) || 0
      ) || 0;
    const hsaAnnual = parseFloat(offerData.hsa_contribution) || 0;
    const commuterAnnual = (parseFloat(offerData.commuter_benefits) || 0) * 12;
    const mealAnnual = (parseFloat(offerData.meal_stipend) || 0) * 12;
    const remoteWorkAnnual =
      (parseFloat(offerData.remote_work_stipend) || 0) * 12;
    const professionalDevAnnual =
      parseFloat(offerData.professional_development_budget) || 0;
    const tuitionAnnual = parseFloat(offerData.tuition_reimbursement) || 0;

    const benefits_value_annual =
      healthInsuranceAnnual +
      match401kAnnual +
      hsaAnnual +
      commuterAnnual +
      mealAnnual +
      remoteWorkAnnual +
      professionalDevAnnual +
      tuitionAnnual;

    // Total comp year 1 (includes signing bonus)
    const annualEquityValue = equityAmount / vestingYears;
    const total_compensation_year_1 =
      baseSalary +
      signingBonus +
      annualBonus +
      annualEquityValue +
      benefits_value_annual;

    // Average annual total comp (amortized over vesting period)
    const total_compensation_annual_avg =
      baseSalary + annualBonus + annualEquityValue + benefits_value_annual;

    // COL adjusted salary
    const col_adjusted_salary = (baseSalary / colIndex) * 100;

    // Calculate scores
    const scores = this.calculateScores(offerData, {
      total_cash_compensation,
      total_compensation_year_1,
      total_compensation_annual_avg,
      benefits_value_annual,
      col_adjusted_salary,
    });

    return {
      total_cash_compensation: Math.round(total_cash_compensation),
      total_compensation_year_1: Math.round(total_compensation_year_1),
      total_compensation_annual_avg: Math.round(total_compensation_annual_avg),
      benefits_value_annual: Math.round(benefits_value_annual),
      col_adjusted_salary: Math.round(col_adjusted_salary),
      ...scores,
    };
  }

  calculateScores(offerData, calculations) {
    // Financial score (0-100 based on total comp)
    // Normalize against typical range (50k - 500k)
    const minComp = 50000;
    const maxComp = 500000;
    const financial_score = Math.min(
      100,
      Math.max(
        0,
        ((calculations.total_compensation_annual_avg - minComp) /
          (maxComp - minComp)) *
          100
      )
    );

    // Non-financial score (average of all non-financial factors, normalized to 100)
    const factors = [
      offerData.culture_fit_score,
      offerData.growth_opportunities_score,
      offerData.work_life_balance_score,
      offerData.team_quality_score,
      offerData.management_quality_score,
      offerData.tech_stack_score,
      offerData.company_stability_score,
      offerData.learning_opportunities_score,
    ].filter((s) => s !== null && s !== undefined);

    const non_financial_score =
      factors.length > 0
        ? (factors.reduce((a, b) => a + b, 0) / factors.length) * 20 // Convert 1-5 scale to 0-100
        : 0;

    // Overall score (weighted average, default 60% financial, 40% non-financial)
    const overall_score = financial_score * 0.6 + non_financial_score * 0.4;

    return {
      financial_score: parseFloat(financial_score.toFixed(2)),
      non_financial_score: parseFloat(non_financial_score.toFixed(2)),
      overall_score: parseFloat(overall_score.toFixed(2)),
    };
  }

  calculateWeightedScores(offer, weights) {
    // Recalculate overall score with custom weights
    const financialScore = offer.financial_score || 0;

    // Non-financial factors (convert 1-5 to 0-100)
    const cultureFit = (offer.culture_fit_score || 0) * 20;
    const growthOpp = (offer.growth_opportunities_score || 0) * 20;
    const workLife = (offer.work_life_balance_score || 0) * 20;
    const teamQuality = (offer.team_quality_score || 0) * 20;
    const managementQuality = (offer.management_quality_score || 0) * 20;
    const techStack = (offer.tech_stack_score || 0) * 20;
    const companyStability = (offer.company_stability_score || 0) * 20;
    const learningOpp = (offer.learning_opportunities_score || 0) * 20;

    // Location score (based on COL index - lower is better)
    const locationScore = Math.max(0, 100 - (offer.col_index - 100));

    // Remote policy score
    const remotePolicyScore =
      offer.remote_policy === "Full Remote"
        ? 100
        : offer.remote_policy === "Hybrid"
        ? 60
        : 20;

    const overall_score =
      financialScore * weights.financial +
      cultureFit * weights.culture_fit +
      growthOpp * weights.growth_opportunities +
      workLife * weights.work_life_balance +
      teamQuality * weights.team_quality +
      managementQuality * weights.management_quality +
      techStack * weights.tech_stack +
      companyStability * weights.company_stability +
      learningOpp * weights.learning_opportunities +
      locationScore * weights.location +
      remotePolicyScore * weights.remote_policy;

    return {
      overall_score: parseFloat(overall_score.toFixed(2)),
    };
  }

  buildComparisonMatrix(offers) {
    const headers = ["Category", ...offers.map((o) => o.company)];

    const rows = [];

    // Compensation rows
    rows.push({
      category: "Base Salary",
      values: ["Base Salary", ...offers.map((o) => o.base_salary)],
      format: "currency",
    });

    rows.push({
      category: "Signing Bonus",
      values: ["Signing Bonus", ...offers.map((o) => o.signing_bonus || 0)],
      format: "currency",
    });

    rows.push({
      category: "Annual Bonus",
      values: ["Annual Bonus", ...offers.map((o) => o.annual_bonus || 0)],
      format: "currency",
    });

    rows.push({
      category: "Equity",
      values: ["Equity", ...offers.map((o) => o.equity_amount || 0)],
      format: "currency",
    });

    rows.push({
      category: "Total Comp (Year 1)",
      values: [
        "Total Comp (Year 1)",
        ...offers.map((o) => o.total_compensation_year_1),
      ],
      format: "currency",
      highlight: "best",
    });

    rows.push({
      category: "Total Comp (Annual Avg)",
      values: [
        "Total Comp (Annual Avg)",
        ...offers.map((o) => o.total_compensation_annual_avg),
      ],
      format: "currency",
      highlight: "best",
    });

    // Benefits rows
    rows.push({
      category: "PTO Days",
      values: ["PTO Days", ...offers.map((o) => o.pto_days || 0)],
      format: "number",
      highlight: "best",
    });

    rows.push({
      category: "401k Match %",
      values: [
        "401k Match %",
        ...offers.map((o) => o.retirement_401k_match_percentage || 0),
      ],
      format: "percentage",
    });

    // Location rows
    rows.push({
      category: "Location",
      values: ["Location", ...offers.map((o) => o.location)],
      format: "text",
    });

    rows.push({
      category: "Remote Policy",
      values: ["Remote Policy", ...offers.map((o) => o.remote_policy || "N/A")],
      format: "text",
    });

    rows.push({
      category: "COL Adjusted Salary",
      values: [
        "COL Adjusted Salary",
        ...offers.map((o) => o.col_adjusted_salary),
      ],
      format: "currency",
      highlight: "best",
    });

    // Scores rows
    rows.push({
      category: "Culture Fit",
      values: [
        "Culture Fit",
        ...offers.map((o) => o.culture_fit_score || "N/A"),
      ],
      format: "score",
    });

    rows.push({
      category: "Growth Opportunities",
      values: [
        "Growth Opportunities",
        ...offers.map((o) => o.growth_opportunities_score || "N/A"),
      ],
      format: "score",
    });

    rows.push({
      category: "Work-Life Balance",
      values: [
        "Work-Life Balance",
        ...offers.map((o) => o.work_life_balance_score || "N/A"),
      ],
      format: "score",
    });

    rows.push({
      category: "Overall Score",
      values: ["Overall Score", ...offers.map((o) => o.overall_score)],
      format: "number",
      highlight: "best",
    });

    return { headers, rows };
  }

  generateComparisonRecommendations(offers) {
    const recommendations = [];

    // Find best overall
    const bestOverall = offers.reduce((best, current) =>
      current.overall_score > best.overall_score ? current : best
    );

    recommendations.push({
      offer_id: bestOverall.id,
      company: bestOverall.company,
      recommendation_type: "best_overall",
      reasoning: `Highest overall score of ${bestOverall.overall_score.toFixed(
        1
      )}/100`,
      pros: [
        `Total compensation: $${bestOverall.total_compensation_annual_avg.toLocaleString()}`,
        bestOverall.remote_policy
          ? `${bestOverall.remote_policy} work`
          : "Flexible work arrangement",
        bestOverall.pto_days
          ? `${bestOverall.pto_days} PTO days`
          : "Competitive benefits",
      ],
      cons: [],
    });

    // Find best financial
    const bestFinancial = offers.reduce((best, current) =>
      current.total_compensation_annual_avg >
      best.total_compensation_annual_avg
        ? current
        : best
    );

    if (bestFinancial.id !== bestOverall.id) {
      recommendations.push({
        offer_id: bestFinancial.id,
        company: bestFinancial.company,
        recommendation_type: "best_financial",
        reasoning: `Highest total compensation package`,
        pros: [
          `Total compensation: $${bestFinancial.total_compensation_annual_avg.toLocaleString()}`,
          bestFinancial.equity_amount
            ? `Equity: $${bestFinancial.equity_amount.toLocaleString()}`
            : "Strong base salary",
        ],
        cons: ["May have trade-offs in work-life balance or culture fit"],
      });
    }

    // Find best culture
    const bestCulture = offers.reduce((best, current) => {
      const currentCultureScore = current.culture_fit_score || 0;
      const bestCultureScore = best.culture_fit_score || 0;
      return currentCultureScore > bestCultureScore ? current : best;
    });

    if (
      bestCulture.id !== bestOverall.id &&
      bestCulture.culture_fit_score >= 4
    ) {
      recommendations.push({
        offer_id: bestCulture.id,
        company: bestCulture.company,
        recommendation_type: "best_culture",
        reasoning: `Highest culture fit score`,
        pros: [
          `Culture fit: ${bestCulture.culture_fit_score}/5`,
          "Strong alignment with values and work style",
        ],
        cons: ["May not be the highest compensation"],
      });
    }

    return recommendations;
  }

  formatJobOffer(row) {
    if (!row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      job_opportunity_id: row.job_opportunity_id,
      interview_id: row.interview_id,
      company: row.company,
      position_title: row.position_title,
      offer_date: row.offer_date,
      decision_deadline: row.decision_deadline,
      base_salary: parseFloat(row.base_salary),
      signing_bonus: parseFloat(row.signing_bonus) || 0,
      annual_bonus: parseFloat(row.annual_bonus) || 0,
      bonus_percentage: row.bonus_percentage
        ? parseFloat(row.bonus_percentage)
        : null,
      performance_bonus_max: parseFloat(row.performance_bonus_max) || 0,
      equity_type: row.equity_type,
      equity_amount: parseFloat(row.equity_amount) || 0,
      equity_vesting_schedule: row.equity_vesting_schedule,
      equity_vesting_years: row.equity_vesting_years,
      equity_cliff_months: row.equity_cliff_months,
      health_insurance_monthly_value:
        parseFloat(row.health_insurance_monthly_value) || 0,
      health_insurance_coverage: row.health_insurance_coverage,
      dental_insurance: row.dental_insurance,
      vision_insurance: row.vision_insurance,
      life_insurance: row.life_insurance,
      disability_insurance: row.disability_insurance,
      retirement_401k_match_percentage:
        parseFloat(row.retirement_401k_match_percentage) || 0,
      retirement_401k_match_max: parseFloat(row.retirement_401k_match_max) || 0,
      hsa_contribution: parseFloat(row.hsa_contribution) || 0,
      pto_days: row.pto_days,
      sick_days: row.sick_days,
      holidays: row.holidays,
      parental_leave_weeks: row.parental_leave_weeks,
      relocation_assistance: parseFloat(row.relocation_assistance) || 0,
      tuition_reimbursement: parseFloat(row.tuition_reimbursement) || 0,
      professional_development_budget:
        parseFloat(row.professional_development_budget) || 0,
      gym_membership: row.gym_membership,
      commuter_benefits: parseFloat(row.commuter_benefits) || 0,
      meal_stipend: parseFloat(row.meal_stipend) || 0,
      remote_work_stipend: parseFloat(row.remote_work_stipend) || 0,
      location: row.location,
      remote_policy: row.remote_policy,
      remote_days_per_week: row.remote_days_per_week,
      required_office_days: row.required_office_days,
      timezone: row.timezone,
      col_index: parseFloat(row.col_index) || 100,
      col_adjusted_salary: parseFloat(row.col_adjusted_salary),
      culture_fit_score: row.culture_fit_score,
      growth_opportunities_score: row.growth_opportunities_score,
      work_life_balance_score: row.work_life_balance_score,
      team_quality_score: row.team_quality_score,
      management_quality_score: row.management_quality_score,
      tech_stack_score: row.tech_stack_score,
      company_stability_score: row.company_stability_score,
      learning_opportunities_score: row.learning_opportunities_score,
      total_cash_compensation: parseFloat(row.total_cash_compensation),
      total_compensation_year_1: parseFloat(row.total_compensation_year_1),
      total_compensation_annual_avg: parseFloat(
        row.total_compensation_annual_avg
      ),
      benefits_value_annual: parseFloat(row.benefits_value_annual),
      overall_score: parseFloat(row.overall_score),
      financial_score: parseFloat(row.financial_score),
      non_financial_score: parseFloat(row.non_financial_score),
      negotiation_status: row.negotiation_status,
      negotiation_notes: row.negotiation_notes,
      negotiation_history:
        typeof row.negotiation_history === "string"
          ? JSON.parse(row.negotiation_history)
          : row.negotiation_history || [],
      negotiation_recommendations:
        typeof row.negotiation_recommendations === "string"
          ? JSON.parse(row.negotiation_recommendations)
          : row.negotiation_recommendations || [],
      offer_status: row.offer_status,
      accepted_at: row.accepted_at,
      declined_at: row.declined_at,
      decline_reason: row.decline_reason,
      scenarios:
        typeof row.scenarios === "string"
          ? JSON.parse(row.scenarios)
          : row.scenarios || [],
      notes: row.notes,
      offer_letter_url: row.offer_letter_url,
      documents:
        typeof row.documents === "string"
          ? JSON.parse(row.documents)
          : row.documents || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Additional fields from joins
      job_title: row.job_title,
      job_company: row.job_company,
      interview_type: row.interview_type,
      interview_date: row.interview_date,
    };
  }
}

export default new JobOfferService();

