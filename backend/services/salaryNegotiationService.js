import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

/**
 * SalaryNegotiationService
 * 
 * CACHING: All AI-generated content is cached in the database:
 * - talking_points: JSON array of generated talking points
 * - scripts: JSON object with scenario-based negotiation scripts
 * - market_salary_data: JSON object with market research data
 * - negotiation_strategy: JSON object containing timing strategy and other strategies
 * - market_research_notes: Text notes from market research
 * 
 * All cached content is automatically loaded when fetching a negotiation via getNegotiationById.
 * AI services check for cached content before generating new content.
 */
class SalaryNegotiationService {
  constructor() {
    this.validStatuses = ["draft", "active", "completed", "archived"];
    this.validOutcomes = ["accepted", "rejected", "pending", "withdrawn"];
  }

  // Validate status
  validateStatus(status) {
    if (status && !this.validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${this.validStatuses.join(", ")}`
      );
    }
  }

  // Validate outcome
  validateOutcome(outcome) {
    if (outcome && !this.validOutcomes.includes(outcome)) {
      throw new Error(
        `Invalid outcome. Must be one of: ${this.validOutcomes.join(", ")}`
      );
    }
  }

  // Calculate total compensation
  calculateTotalCompensation(compensationData) {
    const {
      baseSalary = 0,
      bonus = 0,
      equity = 0,
      benefitsValue = 0,
    } = compensationData;
    return baseSalary + bonus + equity + benefitsValue;
  }

  // Create new negotiation
  async createNegotiation(userId, jobOpportunityId, offerData) {
    try {
      // Verify job opportunity exists and belongs to user
      const jobCheck = await database.query(
        `SELECT id FROM job_opportunities WHERE id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );

      if (jobCheck.rows.length === 0) {
        throw new Error("Job opportunity not found or access denied");
      }

      // Check if negotiation already exists for this job
      const existing = await database.query(
        `SELECT id FROM salary_negotiations WHERE job_opportunity_id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );

      if (existing.rows.length > 0) {
        // Return the existing negotiation ID instead of throwing an error
        // This allows the frontend to handle it gracefully (e.g., navigate to existing negotiation)
        const existingId = existing.rows[0].id;
        const existingNegotiation = await this.getNegotiationById(existingId, userId);
        if (existingNegotiation) {
          return {
            ...existingNegotiation,
            _alreadyExists: true, // Flag to indicate this was an existing negotiation
          };
        }
        // If we can't fetch it for some reason, still throw
        throw new Error("Negotiation already exists for this job opportunity");
      }

      const negotiationId = uuidv4();
      const {
        initialOffer = {},
        targetCompensation = {},
        initialOfferDate,
      } = offerData;

      // Calculate totals
      const initialTotal = this.calculateTotalCompensation(initialOffer);
      const targetTotal = this.calculateTotalCompensation(targetCompensation);

      const query = `
        INSERT INTO salary_negotiations (
          id, user_id, job_opportunity_id,
          initial_offer_base_salary, initial_offer_bonus, initial_offer_equity,
          initial_offer_benefits_value, initial_offer_total_compensation,
          initial_offer_currency, initial_offer_date,
          target_base_salary, target_bonus, target_equity,
          target_benefits_value, target_total_compensation,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10,
          $11, $12, $13, $14, $15,
          'draft', NOW(), NOW()
        )
        RETURNING *
      `;

      const result = await database.query(query, [
        negotiationId,
        userId,
        jobOpportunityId,
        initialOffer.baseSalary || null,
        initialOffer.bonus || null,
        initialOffer.equity || null,
        initialOffer.benefitsValue || null,
        initialTotal,
        initialOffer.currency || "USD",
        initialOfferDate || null,
        targetCompensation.baseSalary || null,
        targetCompensation.bonus || null,
        targetCompensation.equity || null,
        targetCompensation.benefitsValue || null,
        targetTotal,
      ]);

      return this.mapRowToNegotiation(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating salary negotiation:", error);
      throw error;
    }
  }

  // Get negotiation by ID
  async getNegotiationById(negotiationId, userId) {
    try {
      const query = `
        SELECT sn.*, jo.title as job_title, jo.company, jo.location
        FROM salary_negotiations sn
        JOIN job_opportunities jo ON sn.job_opportunity_id = jo.id
        WHERE sn.id = $1 AND sn.user_id = $2
      `;

      const result = await database.query(query, [negotiationId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToNegotiation(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting salary negotiation:", error);
      throw error;
    }
  }

  // Get all negotiations for user
  async getNegotiationsByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT sn.*, jo.title as job_title, jo.company, jo.location
        FROM salary_negotiations sn
        JOIN job_opportunities jo ON sn.job_opportunity_id = jo.id
        WHERE sn.user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      if (filters.status) {
        query += ` AND sn.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.outcome) {
        query += ` AND sn.negotiation_outcome = $${paramIndex}`;
        params.push(filters.outcome);
        paramIndex++;
      }

      query += ` ORDER BY sn.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await database.query(query, params);

      return result.rows.map((row) => this.mapRowToNegotiation(row));
    } catch (error) {
      console.error("❌ Error getting salary negotiations:", error);
      throw error;
    }
  }

  // Get negotiation by job opportunity
  async getNegotiationByJobOpportunity(jobOpportunityId, userId) {
    try {
      const query = `
        SELECT sn.*, jo.title as job_title, jo.company, jo.location
        FROM salary_negotiations sn
        JOIN job_opportunities jo ON sn.job_opportunity_id = jo.id
        WHERE sn.job_opportunity_id = $1 AND sn.user_id = $2
      `;

      const result = await database.query(query, [jobOpportunityId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToNegotiation(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting negotiation by job:", error);
      throw error;
    }
  }

  // Update negotiation
  async updateNegotiation(negotiationId, userId, updates) {
    try {
      // Verify ownership
      const existing = await this.getNegotiationById(negotiationId, userId);
      if (!existing) {
        throw new Error("Negotiation not found or access denied");
      }

      const allowedFields = [
        "target_base_salary",
        "target_bonus",
        "target_equity",
        "target_benefits_value",
        "target_total_compensation",
        "negotiation_strategy",
        "talking_points",
        "scripts",
        "market_salary_data",
        "market_research_notes",
        "status",
      ];

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Handle target compensation update
      if (updates.targetCompensation) {
        const target = updates.targetCompensation;
        if (target.baseSalary !== undefined) {
          updateFields.push(`target_base_salary = $${paramIndex++}`);
          updateValues.push(target.baseSalary);
        }
        if (target.bonus !== undefined) {
          updateFields.push(`target_bonus = $${paramIndex++}`);
          updateValues.push(target.bonus);
        }
        if (target.equity !== undefined) {
          updateFields.push(`target_equity = $${paramIndex++}`);
          updateValues.push(target.equity);
        }
        if (target.benefitsValue !== undefined) {
          updateFields.push(`target_benefits_value = $${paramIndex++}`);
          updateValues.push(target.benefitsValue);
        }

        // Recalculate total
        const newTotal = this.calculateTotalCompensation({
          baseSalary: target.baseSalary ?? existing.targetCompensation?.baseSalary ?? 0,
          bonus: target.bonus ?? existing.targetCompensation?.bonus ?? 0,
          equity: target.equity ?? existing.targetCompensation?.equity ?? 0,
          benefitsValue: target.benefitsValue ?? existing.targetCompensation?.benefitsValue ?? 0,
        });
        updateFields.push(`target_total_compensation = $${paramIndex++}`);
        updateValues.push(newTotal);
      }

      // Handle other fields
      if (updates.negotiationStrategy !== undefined) {
        updateFields.push(`negotiation_strategy = $${paramIndex++}`);
        updateValues.push(
          typeof updates.negotiationStrategy === "string"
            ? updates.negotiationStrategy
            : JSON.stringify(updates.negotiationStrategy)
        );
      }

      if (updates.talkingPoints !== undefined) {
        updateFields.push(`talking_points = $${paramIndex++}`);
        updateValues.push(
          typeof updates.talkingPoints === "string"
            ? updates.talkingPoints
            : JSON.stringify(updates.talkingPoints)
        );
      }

      if (updates.scripts !== undefined) {
        updateFields.push(`scripts = $${paramIndex++}`);
        updateValues.push(
          typeof updates.scripts === "string"
            ? updates.scripts
            : JSON.stringify(updates.scripts)
        );
      }

      if (updates.marketSalaryData !== undefined) {
        updateFields.push(`market_salary_data = $${paramIndex++}`);
        updateValues.push(
          typeof updates.marketSalaryData === "string"
            ? updates.marketSalaryData
            : JSON.stringify(updates.marketSalaryData)
        );
      }

      if (updates.marketResearchNotes !== undefined) {
        updateFields.push(`market_research_notes = $${paramIndex++}`);
        updateValues.push(updates.marketResearchNotes);
      }

      if (updates.status !== undefined) {
        this.validateStatus(updates.status);
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updates.status);
      }

      if (updateFields.length === 0) {
        return existing;
      }

      updateValues.push(negotiationId, userId);

      const query = `
        UPDATE salary_negotiations
        SET ${updateFields.join(", ")}, updated_at = NOW()
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await database.query(query, updateValues);

      return this.mapRowToNegotiation(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating salary negotiation:", error);
      throw error;
    }
  }

  // Add counteroffer
  async updateCounteroffer(negotiationId, userId, counterofferData) {
    try {
      const existing = await this.getNegotiationById(negotiationId, userId);
      if (!existing) {
        throw new Error("Negotiation not found or access denied");
      }

      const {
        baseSalary,
        bonus = 0,
        equity = 0,
        benefitsValue = 0,
        notes,
      } = counterofferData;

      const totalCompensation = this.calculateTotalCompensation({
        baseSalary,
        bonus,
        equity,
        benefitsValue,
      });

      // Get existing counteroffer history
      let counterofferHistory = [];
      if (existing.counterofferHistory) {
        counterofferHistory = Array.isArray(existing.counterofferHistory)
          ? existing.counterofferHistory
          : JSON.parse(existing.counterofferHistory);
      }

      // Add new counteroffer
      const newCounteroffer = {
        id: uuidv4(),
        baseSalary,
        bonus,
        equity,
        benefitsValue,
        totalCompensation,
        date: new Date().toISOString(),
        notes: notes || null,
      };

      counterofferHistory.push(newCounteroffer);

      const query = `
        UPDATE salary_negotiations
        SET
          counteroffer_count = counteroffer_count + 1,
          latest_counteroffer_base = $1,
          latest_counteroffer_total = $2,
          counteroffer_history = $3,
          updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `;

      const result = await database.query(query, [
        baseSalary,
        totalCompensation,
        JSON.stringify(counterofferHistory),
        negotiationId,
        userId,
      ]);

      return this.mapRowToNegotiation(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating counteroffer:", error);
      throw error;
    }
  }

  // Complete negotiation
  async completeNegotiation(negotiationId, userId, outcomeData) {
    try {
      const existing = await this.getNegotiationById(negotiationId, userId);
      if (!existing) {
        throw new Error("Negotiation not found or access denied");
      }

      const {
        finalCompensation = {},
        outcome,
        outcomeDate,
        outcomeNotes,
      } = outcomeData;

      if (outcome) {
        this.validateOutcome(outcome);
      }

      const finalTotal = this.calculateTotalCompensation(finalCompensation);

      const query = `
        UPDATE salary_negotiations
        SET
          final_base_salary = $1,
          final_bonus = $2,
          final_equity = $3,
          final_benefits_value = $4,
          final_total_compensation = $5,
          negotiation_outcome = $6,
          outcome_date = $7,
          outcome_notes = $8,
          status = 'completed',
          updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING *
      `;

      const result = await database.query(query, [
        finalCompensation.baseSalary || null,
        finalCompensation.bonus || null,
        finalCompensation.equity || null,
        finalCompensation.benefitsValue || null,
        finalTotal,
        outcome || null,
        outcomeDate || null,
        outcomeNotes || null,
        negotiationId,
        userId,
      ]);

      const updated = this.mapRowToNegotiation(result.rows[0]);

      // Add to salary progression history if accepted
      if (outcome === "accepted" && finalTotal > 0) {
        await this.addSalaryProgressionEntry(userId, {
          negotiationId,
          jobOpportunityId: existing.jobOpportunityId,
          baseSalary: finalCompensation.baseSalary || 0,
          bonus: finalCompensation.bonus,
          equity: finalCompensation.equity,
          benefitsValue: finalCompensation.benefitsValue,
          totalCompensation: finalTotal,
          roleTitle: existing.jobTitle,
          company: existing.company,
          location: existing.location,
          effectiveDate: outcomeDate || new Date().toISOString().split("T")[0],
          negotiationType: "accepted",
        });
      }

      return updated;
    } catch (error) {
      console.error("❌ Error completing negotiation:", error);
      throw error;
    }
  }

  // Get salary progression history
  async getSalaryProgression(userId) {
    try {
      const query = `
        SELECT *
        FROM salary_progression_history
        WHERE user_id = $1
        ORDER BY effective_date DESC
      `;

      const result = await database.query(query, [userId]);

      return result.rows.map((row) => ({
        id: row.id,
        negotiationId: row.negotiation_id,
        jobOpportunityId: row.job_opportunity_id,
        baseSalary: parseFloat(row.base_salary),
        bonus: row.bonus ? parseFloat(row.bonus) : null,
        equity: row.equity ? parseFloat(row.equity) : null,
        benefitsValue: row.benefits_value
          ? parseFloat(row.benefits_value)
          : null,
        totalCompensation: parseFloat(row.total_compensation),
        currency: row.currency || "USD",
        roleTitle: row.role_title,
        company: row.company,
        location: row.location,
        effectiveDate: row.effective_date,
        negotiationType: row.negotiation_type,
        createdAt: row.created_at,
        notes: row.notes,
      }));
    } catch (error) {
      console.error("❌ Error getting salary progression:", error);
      throw error;
    }
  }

  // Add salary progression entry
  async addSalaryProgressionEntry(userId, salaryData) {
    try {
      const {
        negotiationId,
        jobOpportunityId,
        baseSalary,
        bonus,
        equity,
        benefitsValue,
        totalCompensation,
        currency = "USD",
        roleTitle,
        company,
        location,
        effectiveDate,
        negotiationType,
        notes,
      } = salaryData;

      const entryId = uuidv4();

      const query = `
        INSERT INTO salary_progression_history (
          id, user_id, negotiation_id, job_opportunity_id,
          base_salary, bonus, equity, benefits_value, total_compensation,
          currency, role_title, company, location, effective_date,
          negotiation_type, notes, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, NOW()
        )
        RETURNING *
      `;

      const result = await database.query(query, [
        entryId,
        userId,
        negotiationId || null,
        jobOpportunityId || null,
        baseSalary,
        bonus || null,
        equity || null,
        benefitsValue || null,
        totalCompensation,
        currency,
        roleTitle || null,
        company || null,
        location || null,
        effectiveDate,
        negotiationType || null,
        notes || null,
      ]);

      return {
        id: result.rows[0].id,
        baseSalary: parseFloat(result.rows[0].base_salary),
        totalCompensation: parseFloat(result.rows[0].total_compensation),
        effectiveDate: result.rows[0].effective_date,
      };
    } catch (error) {
      console.error("❌ Error adding salary progression entry:", error);
      throw error;
    }
  }

  // Delete salary progression entry
  async deleteSalaryProgressionEntry(userId, entryId) {
    try {
      const query = `
        DELETE FROM salary_progression_history
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [entryId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Salary progression entry not found or access denied");
      }

      return true;
    } catch (error) {
      console.error("❌ Error deleting salary progression entry:", error);
      throw error;
    }
  }

  // Map database row to negotiation object
  mapRowToNegotiation(row) {
    return {
      id: row.id,
      userId: row.user_id,
      jobOpportunityId: row.job_opportunity_id,
      jobTitle: row.job_title,
      company: row.company,
      location: row.location,
      initialOffer: {
        baseSalary: row.initial_offer_base_salary
          ? parseFloat(row.initial_offer_base_salary)
          : null,
        bonus: row.initial_offer_bonus
          ? parseFloat(row.initial_offer_bonus)
          : null,
        equity: row.initial_offer_equity
          ? parseFloat(row.initial_offer_equity)
          : null,
        benefitsValue: row.initial_offer_benefits_value
          ? parseFloat(row.initial_offer_benefits_value)
          : null,
        totalCompensation: row.initial_offer_total_compensation
          ? parseFloat(row.initial_offer_total_compensation)
          : null,
        currency: row.initial_offer_currency || "USD",
        date: row.initial_offer_date,
      },
      targetCompensation: {
        baseSalary: row.target_base_salary
          ? parseFloat(row.target_base_salary)
          : null,
        bonus: row.target_bonus ? parseFloat(row.target_bonus) : null,
        equity: row.target_equity ? parseFloat(row.target_equity) : null,
        benefitsValue: row.target_benefits_value
          ? parseFloat(row.target_benefits_value)
          : null,
        totalCompensation: row.target_total_compensation
          ? parseFloat(row.target_total_compensation)
          : null,
      },
      finalCompensation: row.final_base_salary
        ? {
            baseSalary: parseFloat(row.final_base_salary),
            bonus: row.final_bonus ? parseFloat(row.final_bonus) : null,
            equity: row.final_equity ? parseFloat(row.final_equity) : null,
            benefitsValue: row.final_benefits_value
              ? parseFloat(row.final_benefits_value)
              : null,
            totalCompensation: row.final_total_compensation
              ? parseFloat(row.final_total_compensation)
              : null,
          }
        : null,
      negotiationStrategy: row.negotiation_strategy
        ? typeof row.negotiation_strategy === "string"
          ? JSON.parse(row.negotiation_strategy)
          : row.negotiation_strategy
        : null,
      talkingPoints: row.talking_points
        ? typeof row.talking_points === "string"
          ? JSON.parse(row.talking_points)
          : row.talking_points
        : null,
      scripts: row.scripts
        ? typeof row.scripts === "string"
          ? JSON.parse(row.scripts)
          : row.scripts
        : null,
      marketSalaryData: row.market_salary_data
        ? typeof row.market_salary_data === "string"
          ? JSON.parse(row.market_salary_data)
          : row.market_salary_data
        : null,
      marketResearchNotes: row.market_research_notes,
      counterofferCount: row.counteroffer_count || 0,
      latestCounteroffer: row.latest_counteroffer_base
        ? {
            baseSalary: parseFloat(row.latest_counteroffer_base),
            totalCompensation: row.latest_counteroffer_total
              ? parseFloat(row.latest_counteroffer_total)
              : null,
          }
        : null,
      counterofferHistory: row.counteroffer_history
        ? typeof row.counteroffer_history === "string"
          ? JSON.parse(row.counteroffer_history)
          : row.counteroffer_history
        : [],
      outcome: row.negotiation_outcome,
      outcomeDate: row.outcome_date,
      outcomeNotes: row.outcome_notes,
      confidenceExercisesCompleted: row.confidence_exercises_completed
        ? typeof row.confidence_exercises_completed === "string"
          ? JSON.parse(row.confidence_exercises_completed)
          : row.confidence_exercises_completed
        : [],
      practiceSessionsCompleted: row.practice_sessions_completed || 0,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new SalaryNegotiationService();

