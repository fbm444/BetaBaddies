import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class CompanyResearchService {
  constructor() {
    this.maxDescriptionLength = 2000;
  }

  /**
   * Create or update company information
   * Note: jobId can be null - we can store company research without a job reference
   */
  async upsertCompanyInfo(jobId, companyData) {
    const {
      size,
      industry,
      location,
      website,
      description,
      companyLogo,
      contactEmail,
      contactPhone,
      mission,
      culture,
      values,
      recentDevelopments,
      products,
      competitors,
      whyWorkHere,
      interviewTips,
      foundedYear,
      enrichedData,
    } = companyData;

    try {
      // Check if company info already exists for this job (if jobId provided)
      let existing = { rows: [] };
      if (jobId) {
        const existingQuery = `
          SELECT id FROM company_info WHERE job_id = $1
        `;
        existing = await database.query(existingQuery, [jobId]);
      }

      let companyInfoId;

      if (existing.rows.length > 0) {
        // Update existing
        companyInfoId = existing.rows[0].id;
        const updateQuery = `
          UPDATE company_info 
          SET size = $1, industry = $2, location = $3, website = $4, 
              description = $5, company_logo = $6, contact_email = $7, contact_phone = $8,
              mission = $9, culture = $10, values = $11, recent_developments = $12,
              products = $13, competitors = $14, why_work_here = $15, interview_tips = $16,
              founded_year = $17, enriched_data = $18
          WHERE id = $19
          RETURNING *
        `;
        const result = await database.query(updateQuery, [
          size || null,
          industry || null,
          location || null,
          website || null,
          description || null,
          companyLogo || null,
          contactEmail || null,
          contactPhone || null,
          mission || null,
          culture || null,
          typeof values === "string" ? values : values ? JSON.stringify(values) : null,
          recentDevelopments || null,
          typeof products === "string" ? products : products ? JSON.stringify(products) : null,
          typeof competitors === "string" ? competitors : competitors ? JSON.stringify(competitors) : null,
          whyWorkHere || null,
          interviewTips || null,
          foundedYear || null,
          enrichedData ? JSON.stringify(enrichedData) : null,
          companyInfoId,
        ]);
        return this.mapCompanyInfoRow(result.rows[0]);
      } else {
        // Insert new
        companyInfoId = uuidv4();
        const insertQuery = `
          INSERT INTO company_info 
            (id, job_id, size, industry, location, website, description, company_logo, contact_email, contact_phone,
             mission, culture, values, recent_developments, products, competitors, why_work_here, interview_tips, founded_year, enriched_data)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `;
        const result = await database.query(insertQuery, [
          companyInfoId,
          jobId,
          size || null,
          industry || null,
          location || null,
          website || null,
          description || null,
          companyLogo || null,
          contactEmail || null,
          contactPhone || null,
          mission || null,
          culture || null,
          typeof values === "string" ? values : values ? JSON.stringify(values) : null,
          recentDevelopments || null,
          typeof products === "string" ? products : products ? JSON.stringify(products) : null,
          typeof competitors === "string" ? competitors : competitors ? JSON.stringify(competitors) : null,
          whyWorkHere || null,
          interviewTips || null,
          foundedYear || null,
          enrichedData ? JSON.stringify(enrichedData) : null,
        ]);
        return this.mapCompanyInfoRow(result.rows[0]);
      }
    } catch (error) {
      console.error("❌ Error upserting company info:", error);
      throw error;
    }
  }

  /**
   * Get company info by job ID
   */
  async getCompanyInfoByJobId(jobId) {
    try {
      const query = `
        SELECT * FROM company_info WHERE job_id = $1
      `;
      const result = await database.query(query, [jobId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCompanyInfoRow(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting company info:", error);
      throw error;
    }
  }

  /**
   * Get company info by company info ID
   */
  async getCompanyInfoById(companyInfoId) {
    try {
      const query = `
        SELECT * FROM company_info WHERE id = $1
      `;
      const result = await database.query(query, [companyInfoId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCompanyInfoRow(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting company info by ID:", error);
      throw error;
    }
  }

  /**
   * Add company media link
   */
  async addCompanyMedia(companyId, platform, link) {
    try {
      const mediaId = uuidv4();
      const query = `
        INSERT INTO company_media (id, company_id, platform, link)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await database.query(query, [
        mediaId,
        companyId,
        platform,
        link || null,
      ]);

      return this.mapCompanyMediaRow(result.rows[0]);
    } catch (error) {
      console.error("❌ Error adding company media:", error);
      throw error;
    }
  }

  /**
   * Get all media for a company
   */
  async getCompanyMedia(companyId) {
    try {
      const query = `
        SELECT * FROM company_media WHERE company_id = $1
      `;
      const result = await database.query(query, [companyId]);

      return result.rows.map(this.mapCompanyMediaRow);
    } catch (error) {
      console.error("❌ Error getting company media:", error);
      throw error;
    }
  }

  /**
   * Delete company media
   */
  async deleteCompanyMedia(mediaId) {
    try {
      const query = `
        DELETE FROM company_media WHERE id = $1 RETURNING id
      `;
      const result = await database.query(query, [mediaId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ Error deleting company media:", error);
      throw error;
    }
  }

  /**
   * Add company news item
   */
  async addCompanyNews(companyId, newsData) {
    const { heading, description, type, date, source } = newsData;

    try {
      const newsId = uuidv4();
      const query = `
        INSERT INTO company_news 
          (id, company_id, heading, description, type, date, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const result = await database.query(query, [
        newsId,
        companyId,
        heading,
        description || null,
        type || "misc",
        date || null,
        source || null,
      ]);

      return this.mapCompanyNewsRow(result.rows[0]);
    } catch (error) {
      console.error("❌ Error adding company news:", error);
      throw error;
    }
  }

  /**
   * Get all news for a company
   */
  async getCompanyNews(companyId, options = {}) {
    const { limit = 20, offset = 0, type } = options;

    try {
      let query = `
        SELECT * FROM company_news WHERE company_id = $1
      `;
      const params = [companyId];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += ` ORDER BY date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      return result.rows.map(this.mapCompanyNewsRow);
    } catch (error) {
      console.error("❌ Error getting company news:", error);
      throw error;
    }
  }

  /**
   * Delete company news item
   */
  async deleteCompanyNews(newsId) {
    try {
      const query = `
        DELETE FROM company_news WHERE id = $1 RETURNING id
      `;
      const result = await database.query(query, [newsId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ Error deleting company news:", error);
      throw error;
    }
  }

  /**
   * Get complete company research (info + media + news)
   */
  async getCompleteCompanyResearch(jobId) {
    try {
      const companyInfo = await this.getCompanyInfoByJobId(jobId);

      if (!companyInfo) {
        return null;
      }

      const [media, news] = await Promise.all([
        this.getCompanyMedia(companyInfo.id),
        this.getCompanyNews(companyInfo.id),
      ]);

      return {
        ...companyInfo,
        media,
        news,
      };
    } catch (error) {
      console.error("❌ Error getting complete company research:", error);
      throw error;
    }
  }

  /**
   * Get all researched companies for a user
   */
  async getResearchedCompaniesByUserId(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
      const query = `
        SELECT ci.*, jo.company, jo.title as job_title, jo.id as job_id
        FROM company_info ci
        INNER JOIN job_opportunities jo ON ci.job_id = jo.id
        WHERE jo.user_id = $1
        ORDER BY jo.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await database.query(query, [userId, limit, offset]);

      return result.rows.map((row) => ({
        ...this.mapCompanyInfoRow(row),
        companyName: row.company,
        jobTitle: row.job_title,
        jobId: row.job_id,
      }));
    } catch (error) {
      console.error("❌ Error getting researched companies:", error);
      throw error;
    }
  }

  /**
   * Delete all company research data for a job
   */
  async deleteCompanyResearch(jobId) {
    try {
      const companyInfo = await this.getCompanyInfoByJobId(jobId);

      if (!companyInfo) {
        return false;
      }

      // Delete cascades to media and news due to FK constraints
      const query = `
        DELETE FROM company_info WHERE job_id = $1 RETURNING id
      `;
      const result = await database.query(query, [jobId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ Error deleting company research:", error);
      throw error;
    }
  }

  // Mapping helpers
  mapCompanyInfoRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      jobId: row.job_id,
      size: row.size,
      industry: row.industry,
      location: row.location,
      website: row.website,
      description: row.description,
      companyLogo: row.company_logo,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      mission: row.mission,
      culture: row.culture,
      values: row.values ? (typeof row.values === "string" ? (row.values.startsWith("[") || row.values.startsWith("{") ? JSON.parse(row.values) : row.values) : row.values) : null,
      recentDevelopments: row.recent_developments,
      products: row.products ? (typeof row.products === "string" ? (row.products.startsWith("[") ? JSON.parse(row.products) : row.products) : row.products) : null,
      competitors: row.competitors ? (typeof row.competitors === "string" ? (row.competitors.startsWith("[") ? JSON.parse(row.competitors) : row.competitors) : row.competitors) : null,
      whyWorkHere: row.why_work_here,
      interviewTips: row.interview_tips,
      foundedYear: row.founded_year,
      enrichedData: row.enriched_data ? (typeof row.enriched_data === "string" ? JSON.parse(row.enriched_data) : row.enriched_data) : null,
    };
  }

  mapCompanyMediaRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.company_id,
      platform: row.platform,
      link: row.link,
    };
  }

  mapCompanyNewsRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.company_id,
      heading: row.heading,
      description: row.description,
      type: row.type,
      date: row.date,
      source: row.source,
    };
  }
}

export default new CompanyResearchService();

