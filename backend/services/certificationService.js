import { v4 as uuidv4 } from "uuid";
import database from "./database.js";
import { teamService } from "./collaboration/index.js";

class CertificationService {
  // Create a new certification
  async createCertification(userId, certificationData) {
    const {
      name,
      orgName,
      dateEarned,
      expirationDate,
      neverExpires,
      platform,
      badgeImage,
      verificationUrl,
      category,
      description,
      assessmentScores,
      achievements,
    } = certificationData;

    try {
      // Validate required fields
      if (!name || !orgName || !dateEarned) {
        throw new Error("Name, organization, and date earned are required");
      }

      // Validate dates
      this.validateDates(dateEarned, expirationDate, neverExpires);

      const certificationId = uuidv4();

      const query = `
        INSERT INTO certifications (
          id, user_id, name, org_name, date_earned, 
          expiration_date, never_expires, platform, badge_image,
          verification_url, category, description, assessment_scores, achievements
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await database.query(query, [
        certificationId,
        userId,
        name,
        orgName,
        dateEarned,
        neverExpires ? null : expirationDate,
        neverExpires || false,
        platform || null,
        badgeImage || null,
        verificationUrl || null,
        category || null,
        description || null,
        assessmentScores ? JSON.stringify(assessmentScores) : null,
        achievements ? JSON.stringify(achievements) : null,
      ]);

      const certification = this.formatCertification(result.rows[0]);

      // Log activity to all teams user is a member of
      try {
        const userTeams = await database.query(
          `SELECT team_id, role FROM team_members WHERE user_id = $1 AND active = true`,
          [userId]
        );
        console.log(`[CertificationService] Found ${userTeams.rows.length} teams for user ${userId}`);
        for (const team of userTeams.rows) {
          console.log(`[CertificationService] Logging certification_earned activity to team ${team.team_id}`);
          await teamService.logActivity(
            team.team_id,
            userId,
            team.role || "candidate",
            "certification_earned",
            {
              certification_id: certificationId,
              certification_name: name,
              org_name: orgName,
              date_earned: dateEarned
            }
          );
        }
      } catch (error) {
        console.error("[CertificationService] Error logging certification activity:", error);
        // Don't fail certification creation if activity logging fails
      }

      return certification;
    } catch (error) {
      console.error("❌ Error creating certification:", error);
      throw error;
    }
  }

  // Get all certifications for a user
  async getCertifications(userId) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE user_id = $1
        ORDER BY date_earned DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map(cert => this.formatCertification(cert));
    } catch (error) {
      console.error("❌ Error getting certifications:", error);
      throw error;
    }
  }

  // Get certification by ID
  async getCertificationById(certificationId, userId) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [certificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Certification not found");
      }

      return this.formatCertification(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting certification:", error);
      throw error;
    }
  }

  // Update certification
  async updateCertification(certificationId, userId, updateData) {
    const {
      name,
      orgName,
      dateEarned,
      expirationDate,
      neverExpires,
      platform,
      badgeImage,
      verificationUrl,
      category,
      description,
      assessmentScores,
      achievements,
    } = updateData;

    try {
      // Check if certification exists and belongs to user
      const existingCert = await this.getCertificationById(certificationId, userId);

      // Validate dates if provided
      if (dateEarned || expirationDate !== undefined) {
        this.validateDates(
          dateEarned || existingCert.date_earned,
          expirationDate,
          neverExpires !== undefined ? neverExpires : existingCert.never_expires
        );
      }

      const query = `
        UPDATE certifications
        SET 
          name = COALESCE($3, name),
          org_name = COALESCE($4, org_name),
          date_earned = COALESCE($5, date_earned),
          expiration_date = COALESCE($6, expiration_date),
          never_expires = COALESCE($7, never_expires),
          platform = COALESCE($8, platform),
          badge_image = COALESCE($9, badge_image),
          verification_url = COALESCE($10, verification_url),
          category = COALESCE($11, category),
          description = COALESCE($12, description),
          assessment_scores = COALESCE($13, assessment_scores),
          achievements = COALESCE($14, achievements)
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [
        certificationId,
        userId,
        name || null,
        orgName || null,
        dateEarned || null,
        neverExpires ? null : (expirationDate || null),
        neverExpires !== undefined ? neverExpires : null,
        platform !== undefined ? platform : null,
        badgeImage !== undefined ? badgeImage : null,
        verificationUrl !== undefined ? verificationUrl : null,
        category !== undefined ? category : null,
        description !== undefined ? description : null,
        assessmentScores !== undefined ? JSON.stringify(assessmentScores) : null,
        achievements !== undefined ? JSON.stringify(achievements) : null,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Certification not found");
      }

      return this.formatCertification(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating certification:", error);
      throw error;
    }
  }

  // Delete certification
  async deleteCertification(certificationId, userId) {
    try {
      const query = `
        DELETE FROM certifications
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [certificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Certification not found");
      }

      return { message: "Certification deleted successfully" };
    } catch (error) {
      console.error("❌ Error deleting certification:", error);
      throw error;
    }
  }

  // Get certifications by organization
  async getCertificationsByOrganization(userId, organizationName) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE user_id = $1 AND LOWER(org_name) LIKE LOWER($2)
        ORDER BY date_earned DESC
      `;

      const result = await database.query(query, [userId, `%${organizationName}%`]);
      return result.rows.map(cert => this.formatCertification(cert));
    } catch (error) {
      console.error("❌ Error getting certifications by organization:", error);
      throw error;
    }
  }

  // Get expiring certifications (within next 30 days)
  async getExpiringCertifications(userId, daysAhead = 30) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE user_id = $1 
          AND never_expires = false 
          AND expiration_date IS NOT NULL
          AND expiration_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        ORDER BY expiration_date ASC
      `;

      const result = await database.query(query, [userId]);
      return result.rows.map(cert => this.formatCertification(cert));
    } catch (error) {
      console.error("❌ Error getting expiring certifications:", error);
      throw error;
    }
  }

  // Get certification statistics
  async getCertificationStatistics(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_certifications,
          COUNT(CASE WHEN never_expires = true THEN 1 END) as permanent_certifications,
          COUNT(CASE WHEN never_expires = false AND expiration_date IS NOT NULL THEN 1 END) as expiring_certifications,
          COUNT(CASE WHEN never_expires = false AND expiration_date < CURRENT_DATE THEN 1 END) as expired_certifications
        FROM certifications
        WHERE user_id = $1
      `;

      const result = await database.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error getting certification statistics:", error);
      throw error;
    }
  }

  // Search certifications
  async searchCertifications(userId, searchTerm) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE user_id = $1 
          AND (
            LOWER(name) LIKE LOWER($2) 
            OR LOWER(org_name) LIKE LOWER($2)
            OR LOWER(platform) LIKE LOWER($2)
            OR LOWER(category) LIKE LOWER($2)
            OR LOWER(description) LIKE LOWER($2)
          )
        ORDER BY date_earned DESC
      `;

      const result = await database.query(query, [userId, `%${searchTerm}%`]);
      return result.rows.map(cert => this.formatCertification(cert));
    } catch (error) {
      console.error("❌ Error searching certifications:", error);
      throw error;
    }
  }

  // Get certifications by category
  async getCertificationsByCategory(userId, category) {
    try {
      const query = `
        SELECT *
        FROM certifications
        WHERE user_id = $1 AND category = $2
        ORDER BY date_earned DESC
      `;

      const result = await database.query(query, [userId, category]);
      return result.rows.map(cert => this.formatCertification(cert));
    } catch (error) {
      console.error("❌ Error getting certifications by category:", error);
      throw error;
    }
  }

  // Validate dates
  validateDates(dateEarned, expirationDate, neverExpires) {
    const earnedDate = new Date(dateEarned);
    const expDate = expirationDate ? new Date(expirationDate) : null;

    // Check if date earned is valid
    if (isNaN(earnedDate.getTime())) {
      throw new Error("Invalid date earned format");
    }

    // Check if date earned is not in the future
    if (earnedDate > new Date()) {
      throw new Error("Date earned cannot be in the future");
    }

    // If certification expires, validate expiration date
    if (!neverExpires && expDate) {
      if (isNaN(expDate.getTime())) {
        throw new Error("Invalid expiration date format");
      }

      if (expDate <= earnedDate) {
        throw new Error("Expiration date must be after date earned");
      }
    }

    // Note: Validation for permanent certifications with expiration dates removed
    // to allow more flexible data entry
  }

  // Format certification data for response
  formatCertification(cert) {
    return {
      id: cert.id,
      user_id: cert.user_id,
      name: cert.name,
      org_name: cert.org_name,
      date_earned: cert.date_earned,
      expiration_date: cert.expiration_date,
      never_expires: cert.never_expires,
      platform: cert.platform || null,
      badge_image: cert.badge_image || null,
      verification_url: cert.verification_url || null,
      category: cert.category || null,
      description: cert.description || null,
      assessment_scores: cert.assessment_scores ? (typeof cert.assessment_scores === 'string' ? JSON.parse(cert.assessment_scores) : cert.assessment_scores) : null,
      achievements: cert.achievements ? (typeof cert.achievements === 'string' ? JSON.parse(cert.achievements) : cert.achievements) : null,
      created_at: cert.created_at || null,
      updated_at: cert.updated_at || null,
      // Calculate status based on expiration
      status: this.calculateStatus(cert.expiration_date, cert.never_expires),
      // Calculate days until expiration
      daysUntilExpiration: this.calculateDaysUntilExpiration(cert.expiration_date, cert.never_expires),
    };
  }

  // Calculate certification status
  calculateStatus(expirationDate, neverExpires) {
    if (neverExpires) {
      return "active";
    }

    if (!expirationDate) {
      return "no_expiration";
    }

    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExp = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExp < 0) {
      return "expired";
    } else if (daysUntilExp <= 30) {
      return "expiring_soon";
    } else {
      return "active";
    }
  }

  // Calculate days until expiration
  calculateDaysUntilExpiration(expirationDate, neverExpires) {
    if (neverExpires || !expirationDate) {
      return null;
    }

    const expDate = new Date(expirationDate);
    const today = new Date();
    return Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  }
}

export default new CertificationService();
