import { v4 as uuidv4 } from "uuid";
import database from "./database.js";

/**
 * Simple company research service that stores data by company name
 * instead of job_id, avoiding FK constraint issues
 */
class CompanyResearchSimpleService {
  /**
   * Save or update company research data
   */
  async saveCompanyResearch(userId, companyName, researchData) {
    const { companyInfo, socialMedia, news } = researchData;

    try {
      // Store in a simple JSON format for now
      // Later we can create a proper company_research table
      const researchId = uuidv4();
      
      const query = `
        INSERT INTO company_info (id, job_id, size, industry, location, website, description, company_logo)
        VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (job_id) WHERE job_id IS NULL
        DO UPDATE SET 
          size = EXCLUDED.size,
          industry = EXCLUDED.industry,
          location = EXCLUDED.location,
          website = EXCLUDED.website,
          description = EXCLUDED.description,
          company_logo = EXCLUDED.company_logo
        RETURNING id
      `;
      
      const result = await database.query(query, [
        researchId,
        companyInfo.size,
        companyInfo.industry,
        companyInfo.location,
        companyInfo.website,
        companyInfo.description,
        companyInfo.companyLogo,
      ]);

      const companyInfoId = result.rows[0].id;

      // Add social media
      for (const media of socialMedia) {
        await database.query(
          `INSERT INTO company_media (id, company_id, platform, link) VALUES ($1, $2, $3, $4)`,
          [uuidv4(), companyInfoId, media.platform, media.link]
        );
      }

      // Add news
      for (const newsItem of news) {
        await database.query(
          `INSERT INTO company_news (id, company_id, heading, description, type, date, source) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            companyInfoId,
            newsItem.heading,
            newsItem.description,
            newsItem.type,
            newsItem.date,
            newsItem.source,
          ]
        );
      }

      return companyInfoId;
    } catch (error) {
      console.error("❌ Error saving company research:", error);
      throw error;
    }
  }
}

export default new CompanyResearchSimpleService();

