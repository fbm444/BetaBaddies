import database from "./database.js";

class DocumentPerformanceService {
  /**
   * Register a new document version
   */
  async registerDocumentVersion(userId, documentData) {
    try {
      const {
        documentType,
        documentName,
        templateName,
        templateCategory,
        filePath,
        fileHash,
        isPrimary = false
      } = documentData;

      if (!documentType || !documentName) {
        throw new Error("documentType and documentName are required");
      }

      // Get next version number
      const versionQuery = `
        SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
        FROM application_documents
        WHERE user_id = $1 AND document_type = $2
      `;
      const versionResult = await database.query(versionQuery, [userId, documentType]);
      const versionNumber = versionResult.rows[0].next_version;

      // If setting as primary, unset other primary documents of same type
      if (isPrimary) {
        await database.query(
          `UPDATE application_documents SET is_primary = false WHERE user_id = $1 AND document_type = $2`,
          [userId, documentType]
        );
      }

      const insertQuery = `
        INSERT INTO application_documents (
          user_id, document_type, document_name, version_number,
          template_name, template_category, file_path, file_hash,
          is_primary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        userId,
        documentType,
        documentName,
        versionNumber,
        templateName || null,
        templateCategory || null,
        filePath || null,
        fileHash || null,
        isPrimary
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("❌ Error registering document version:", error);
      throw error;
    }
  }

  /**
   * Get document performance metrics
   */
  async getDocumentPerformance(userId, documentId) {
    try {
      // Get document info
      const docQuery = `
        SELECT *
        FROM application_documents
        WHERE id = $1 AND user_id = $2
      `;
      const docResult = await database.query(docQuery, [documentId, userId]);

      if (docResult.rows.length === 0) {
        throw new Error("Document not found");
      }

      const document = docResult.rows[0];

      // Calculate performance metrics
      const metricsQuery = `
        SELECT 
          COUNT(DISTINCT s.job_opportunity_id) as total_uses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END) as responses,
          COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END) as interviews,
          COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END) as offers,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END), 0) * 100,
            2
          ) as interview_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_strategies s
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE s.user_id = $1
          AND (
            (s.resume_version_id = $2 AND $3 = 'resume')
            OR (s.cover_letter_version_id = $2 AND $3 = 'cover_letter')
          )
      `;

      const metricsResult = await database.query(metricsQuery, [
        userId,
        documentId,
        document.document_type
      ]);

      const metrics = metricsResult.rows[0] || {
        total_uses: 0,
        responses: 0,
        interviews: 0,
        offers: 0,
        response_rate: 0,
        interview_rate: 0,
        offer_rate: 0
      };

      // Update document with latest metrics
      await this.updateDocumentMetrics(documentId, metrics);

      return {
        ...document,
        performance: metrics
      };
    } catch (error) {
      console.error("❌ Error getting document performance:", error);
      throw error;
    }
  }

  /**
   * Compare all versions of a document type
   */
  async compareDocumentVersions(userId, documentType) {
    try {
      const query = `
        SELECT 
          d.id,
          d.document_name,
          d.version_number,
          d.template_name,
          d.template_category,
          d.is_primary,
          d.is_active,
          COUNT(DISTINCT s.job_opportunity_id) as total_uses,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as response_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status IN ('Interview', 'Offer') THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT CASE WHEN jo.status IN ('Phone Screen', 'Interview', 'Offer') THEN s.job_opportunity_id END), 0) * 100,
            2
          ) as interview_rate,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_documents d
        LEFT JOIN application_strategies s ON (
          (s.resume_version_id = d.id AND d.document_type = 'resume')
          OR (s.cover_letter_version_id = d.id AND d.document_type = 'cover_letter')
        ) AND s.user_id = $1
        LEFT JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE d.user_id = $1 AND d.document_type = $2
        GROUP BY d.id, d.document_name, d.version_number, d.template_name, d.template_category, d.is_primary, d.is_active
        ORDER BY offer_rate DESC NULLS LAST, response_rate DESC NULLS LAST, d.version_number DESC
      `;

      const result = await database.query(query, [userId, documentType]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error comparing document versions:", error);
      throw error;
    }
  }

  /**
   * Get best performing documents
   */
  async getBestPerformingDocuments(userId, documentType, limit = 3) {
    try {
      const query = `
        SELECT 
          d.id,
          d.document_name,
          d.version_number,
          d.template_name,
          COUNT(DISTINCT s.job_opportunity_id) as total_uses,
          ROUND(
            COUNT(DISTINCT CASE WHEN jo.status = 'Offer' THEN s.job_opportunity_id END)::DECIMAL / 
            NULLIF(COUNT(DISTINCT s.job_opportunity_id), 0) * 100,
            2
          ) as offer_rate
        FROM application_documents d
        JOIN application_strategies s ON (
          (s.resume_version_id = d.id AND d.document_type = 'resume')
          OR (s.cover_letter_version_id = d.id AND d.document_type = 'cover_letter')
        ) AND s.user_id = $1
        JOIN job_opportunities jo ON s.job_opportunity_id = jo.id
        WHERE d.user_id = $1 
          AND d.document_type = $2
          AND d.is_active = true
        GROUP BY d.id, d.document_name, d.version_number, d.template_name
        HAVING COUNT(DISTINCT s.job_opportunity_id) >= 3
        ORDER BY offer_rate DESC NULLS LAST
        LIMIT $3
      `;

      const result = await database.query(query, [userId, documentType, limit]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting best performing documents:", error);
      throw error;
    }
  }

  /**
   * Update document metrics
   */
  async updateDocumentMetrics(documentId, metrics) {
    try {
      const query = `
        UPDATE application_documents
        SET 
          total_uses = $1,
          response_rate = $2,
          interview_rate = $3,
          offer_rate = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `;

      await database.query(query, [
        metrics.total_uses || 0,
        metrics.response_rate || 0,
        metrics.interview_rate || 0,
        metrics.offer_rate || 0,
        documentId
      ]);
    } catch (error) {
      console.error("❌ Error updating document metrics:", error);
      throw error;
    }
  }

  /**
   * Set document as primary
   */
  async setPrimaryDocument(userId, documentId) {
    try {
      // Get document type
      const docQuery = `
        SELECT document_type
        FROM application_documents
        WHERE id = $1 AND user_id = $2
      `;
      const docResult = await database.query(docQuery, [documentId, userId]);

      if (docResult.rows.length === 0) {
        throw new Error("Document not found");
      }

      const documentType = docResult.rows[0].document_type;

      // Unset other primary documents
      await database.query(
        `UPDATE application_documents SET is_primary = false WHERE user_id = $1 AND document_type = $2`,
        [userId, documentType]
      );

      // Set this as primary
      const updateQuery = `
        UPDATE application_documents
        SET is_primary = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(updateQuery, [documentId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error setting primary document:", error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getDocumentsByUser(userId, documentType = null) {
    try {
      let query = `
        SELECT *
        FROM application_documents
        WHERE user_id = $1
      `;
      const params = [userId];

      if (documentType) {
        query += ` AND document_type = $2`;
        params.push(documentType);
      }

      query += ` ORDER BY document_type, version_number DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getting documents by user:", error);
      throw error;
    }
  }
}

export default new DocumentPerformanceService();

