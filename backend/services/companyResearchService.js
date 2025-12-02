import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

class CompanyResearchService {
  /* -------------------------------------------------------------------------- */
  /* Helper utilities                                                           */
  /* -------------------------------------------------------------------------- */

  normalizeLimit(limit) {
    const parsed = parseInt(limit, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 100);
  }

  normalizeOffset(offset) {
    const parsed = parseInt(offset, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  }

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
      companyName: row.company_name || row.company || null,
      jobTitle: row.job_title || null,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* Company info APIs                                                          */
  /* -------------------------------------------------------------------------- */

  async getResearchedCompaniesByUserId(userId, options = {}) {
    const limit = this.normalizeLimit(options.limit);
    const offset = this.normalizeOffset(options.offset);

    const result = await database.query(
      `SELECT 
        ci.*,
        jo.company AS company_name,
        jo.title AS job_title,
        jo.updated_at AS job_updated_at
      FROM company_info ci
      INNER JOIN job_opportunities jo ON ci.job_id = jo.id
      WHERE jo.user_id = $1
      ORDER BY jo.updated_at DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(this.mapCompanyInfoRow);
  }

  async getCompleteCompanyResearch(jobId) {
    const infoResult = await database.query(
      `SELECT 
        ci.*,
        jo.company AS company_name,
        jo.title AS job_title
      FROM company_info ci
      INNER JOIN job_opportunities jo ON ci.job_id = jo.id
      WHERE ci.job_id = $1`,
      [jobId]
    );

    if (infoResult.rows.length === 0) {
      return null;
    }

    const companyInfo = this.mapCompanyInfoRow(infoResult.rows[0]);

    const [mediaResult, newsResult] = await Promise.all([
      database.query(
        `SELECT id, company_id, platform, link, created_at
         FROM company_media
         WHERE company_id = $1
         ORDER BY created_at DESC NULLS LAST`,
        [companyInfo.id]
      ),
      database.query(
        `SELECT id, company_id, heading, description, type, date, source, created_at
         FROM company_news
         WHERE company_id = $1
         ORDER BY date DESC NULLS LAST, created_at DESC NULLS LAST`,
        [companyInfo.id]
      ),
    ]);

    return {
      ...companyInfo,
      media: mediaResult.rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        platform: row.platform,
        link: row.link,
        createdAt: row.created_at,
      })),
      news: newsResult.rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        heading: row.heading,
        description: row.description,
        type: row.type,
        date: row.date,
        source: row.source,
        createdAt: row.created_at,
      })),
    };
  }

  async upsertCompanyInfo(jobId, companyData) {
    const existingResult = await database.query(
      `SELECT id FROM company_info WHERE job_id = $1`,
      [jobId]
    );

    const payload = {
      size: companyData.size ?? null,
      industry: companyData.industry ?? null,
      location: companyData.location ?? null,
      website: companyData.website ?? null,
      description: companyData.description ?? null,
      company_logo: companyData.companyLogo ?? null,
      contact_email: companyData.contactEmail ?? null,
      contact_phone: companyData.contactPhone ?? null,
    };

    if (existingResult.rows.length > 0) {
      const companyInfoId = existingResult.rows[0].id;
      const updateQuery = `
        UPDATE company_info SET
          size = $1,
          industry = $2,
          location = $3,
          website = $4,
          description = $5,
          company_logo = $6,
          contact_email = $7,
          contact_phone = $8
        WHERE id = $9
        RETURNING *`;

      const updated = await database.query(updateQuery, [
        payload.size,
        payload.industry,
        payload.location,
        payload.website,
        payload.description,
        payload.company_logo,
        payload.contact_email,
        payload.contact_phone,
        companyInfoId,
      ]);

      return this.mapCompanyInfoRow(updated.rows[0]);
    }

    const insertQuery = `
      INSERT INTO company_info (
        id, job_id, size, industry, location, website, description,
        company_logo, contact_email, contact_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`;

    const inserted = await database.query(insertQuery, [
      uuidv4(),
      jobId,
      payload.size,
      payload.industry,
      payload.location,
      payload.website,
      payload.description,
      payload.company_logo,
      payload.contact_email,
      payload.contact_phone,
    ]);

    return this.mapCompanyInfoRow(inserted.rows[0]);
  }

  async deleteCompanyResearch(jobId) {
    const client = await database.getClient();
    try {
      await client.query("BEGIN");

      const infoResult = await client.query(
        `SELECT id FROM company_info WHERE job_id = $1 FOR UPDATE`,
        [jobId]
      );

      if (infoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return false;
      }

      const companyInfoId = infoResult.rows[0].id;

      await client.query(`DELETE FROM company_news WHERE company_id = $1`, [
        companyInfoId,
      ]);
      await client.query(`DELETE FROM company_media WHERE company_id = $1`, [
        companyInfoId,
      ]);
      await client.query(`DELETE FROM company_info WHERE id = $1`, [
        companyInfoId,
      ]);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error deleting company research:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Media & News                                                               */
  /* -------------------------------------------------------------------------- */

  async addCompanyMedia(companyInfoId, platform, link) {
    const result = await database.query(
      `INSERT INTO company_media (id, company_id, platform, link, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, company_id, platform, link, created_at`,
      [uuidv4(), companyInfoId, platform, link]
    );
    return {
      id: result.rows[0].id,
      companyId: result.rows[0].company_id,
      platform: result.rows[0].platform,
      link: result.rows[0].link,
      createdAt: result.rows[0].created_at,
    };
  }

  async getCompanyMedia(companyInfoId) {
    const result = await database.query(
      `SELECT id, company_id, platform, link, created_at
       FROM company_media
       WHERE company_id = $1
       ORDER BY created_at DESC NULLS LAST`,
      [companyInfoId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      platform: row.platform,
      link: row.link,
      createdAt: row.created_at,
    }));
  }

  async deleteCompanyMedia(mediaId) {
    await database.query(`DELETE FROM company_media WHERE id = $1`, [mediaId]);
  }

  async addCompanyNews(companyInfoId, newsData) {
    const result = await database.query(
      `INSERT INTO company_news (
        id, company_id, heading, description, type, date, source, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, company_id, heading, description, type, date, source`,
      [
        uuidv4(),
        companyInfoId,
        newsData.heading,
        newsData.description ?? null,
        newsData.type ?? null,
        newsData.date ?? null,
        newsData.source ?? null,
      ]
    );
    return {
      id: result.rows[0].id,
      companyId: result.rows[0].company_id,
      heading: result.rows[0].heading,
      description: result.rows[0].description,
      type: result.rows[0].type,
      date: result.rows[0].date,
      source: result.rows[0].source,
    };
  }

  async getCompanyNews(companyInfoId, options = {}) {
    const limit = this.normalizeLimit(options.limit);
    const offset = this.normalizeOffset(options.offset);
    const params = [companyInfoId];
    let whereClause = "company_id = $1";

    if (options.type) {
      params.push(options.type);
      whereClause += ` AND type = $${params.length}`;
    }

    params.push(limit, offset);

    const result = await database.query(
      `SELECT id, company_id, heading, description, type, date, source, created_at
       FROM company_news
       WHERE ${whereClause}
       ORDER BY date DESC NULLS LAST, created_at DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      heading: row.heading,
      description: row.description,
      type: row.type,
      date: row.date,
      source: row.source,
      createdAt: row.created_at,
    }));
  }

  async deleteCompanyNews(newsId) {
    await database.query(`DELETE FROM company_news WHERE id = $1`, [newsId]);
  }

  /* -------------------------------------------------------------------------- */
  /* Analytics                                                                  */
  /* -------------------------------------------------------------------------- */

  async calculateResearchScore(jobOpportunityId, userId) {
    try {
      const jobResult = await database.query(
        `SELECT * FROM job_opportunities WHERE id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );

      if (jobResult.rows.length === 0) {
        return {
          score: 0,
          hasData: false,
          status: "missing",
          breakdown: {},
        };
      }

      const job = jobResult.rows[0];
      const breakdown = {
        companyInfo: { score: 0, status: "missing", notes: [] },
        notes: { score: 0, status: "missing", notes: [] },
        insights: { score: 0, status: "missing", notes: [] },
      };

      let companyInfoScore = 0;
      if (job.company && job.company.trim().length > 0) companyInfoScore += 25;
      if (job.location) companyInfoScore += 25;
      if (job.company_url) companyInfoScore += 25;
      if (job.salary_range || job.salary) companyInfoScore += 25;

      breakdown.companyInfo.score = companyInfoScore;
      breakdown.companyInfo.status =
        companyInfoScore === 100
          ? "complete"
          : companyInfoScore >= 50
          ? "partial"
          : "missing";
      breakdown.companyInfo.notes.push(
        `Company info ${breakdown.companyInfo.status} (${companyInfoScore}%)`
      );

      if (job.notes && job.notes.trim().length > 50) {
        breakdown.notes.score = 100;
        breakdown.notes.status = "complete";
        breakdown.notes.notes.push("Detailed notes available");
      } else if (job.notes && job.notes.trim().length > 0) {
        breakdown.notes.score = 50;
        breakdown.notes.status = "partial";
        breakdown.notes.notes.push("Brief notes available");
      } else {
        breakdown.notes.score = 0;
        breakdown.notes.status = "missing";
        breakdown.notes.notes.push("No notes added");
      }

      const interviewResult = await database.query(
        `SELECT COUNT(*) as count FROM interviews 
         WHERE job_opportunity_id = $1 AND user_id = $2`,
        [jobOpportunityId, userId]
      );
      const interviewCount = parseInt(interviewResult.rows[0].count, 10);

      if (interviewCount > 0) {
        breakdown.insights.score = 80;
        breakdown.insights.status = "partial";
        breakdown.insights.notes.push(`${interviewCount} interview(s) scheduled`);
      } else {
        breakdown.insights.score = 30;
        breakdown.insights.status = "missing";
        breakdown.insights.notes.push("No interviews scheduled yet");
      }

      const overallScore =
        breakdown.companyInfo.score * 0.4 +
        breakdown.notes.score * 0.35 +
        breakdown.insights.score * 0.25;

      const hasData = job.company || job.notes || interviewCount > 0;
      const status =
        overallScore >= 80 ? "complete" : overallScore >= 50 ? "partial" : "missing";

      return {
        score: Math.round(overallScore),
        hasData,
        status,
        breakdown,
      };
    } catch (error) {
      console.error("❌ Error calculating research score:", error);
      return {
        score: 0,
        hasData: false,
        status: "error",
        breakdown: {},
      };
    }
  }
}

export default new CompanyResearchService();
