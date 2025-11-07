import database from "./database.js";
import resumeService from "./resumeService.js";
import profileService from "./profileService.js";

class ResumeValidationService {
  constructor() {
    this.maxResumeLength = 2; // pages
    this.minResumeLength = 1; // pages
  }

  // Run full validation on a resume
  async validateResume(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      const issues = [];

      // Get user profile for completeness check
      const profile = await profileService.getProfileByUserId(userId);

      // Check for missing information
      const missingInfoIssues = this.checkMissingInformation(resume, profile);
      issues.push(...missingInfoIssues);

      // Check contact information
      const contactIssues = this.validateContactInformation(profile);
      issues.push(...contactIssues);

      // Check format consistency
      const formatIssues = this.checkFormatConsistency(resume);
      issues.push(...formatIssues);

      // Check length (estimate)
      const lengthIssues = this.checkLength(resume);
      issues.push(...lengthIssues);

      // Save validation issues to database
      if (issues.length > 0) {
        await this.saveValidationIssues(resumeId, issues);
      }

      return {
        issues,
        isValid: issues.filter((i) => i.severity === "error").length === 0,
        errorCount: issues.filter((i) => i.severity === "error").length,
        warningCount: issues.filter((i) => i.severity === "warning").length,
        infoCount: issues.filter((i) => i.severity === "info").length,
      };
    } catch (error) {
      console.error("❌ Error validating resume:", error);
      throw error;
    }
  }

  // Check for missing information
  checkMissingInformation(resume, profile) {
    const issues = [];

    if (!profile?.first_name || !profile?.last_name) {
      issues.push({
        issueType: "missing_info",
        severity: "error",
        message: "Full name is missing from profile",
        sectionReference: "personal",
        suggestion: "Add your first and last name in your profile",
      });
    }

    if (!profile?.email) {
      issues.push({
        issueType: "missing_info",
        severity: "error",
        message: "Email address is missing",
        sectionReference: "personal",
        suggestion: "Add your email address in your profile",
      });
    }

    if (!profile?.phone) {
      issues.push({
        issueType: "missing_info",
        severity: "warning",
        message: "Phone number is missing from contact information",
        sectionReference: "personal",
        suggestion: "Add phone number for better contact options",
      });
    }

    if (!resume.description && !profile?.bio) {
      issues.push({
        issueType: "missing_info",
        severity: "info",
        message: "Resume summary or bio is missing",
        sectionReference: "summary",
        suggestion: "Consider adding a professional summary to highlight your key qualifications",
      });
    }

    return issues;
  }

  // Validate contact information
  validateContactInformation(profile) {
    const issues = [];

    if (profile?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        issues.push({
          issueType: "format",
          severity: "error",
          message: "Email address format is invalid",
          sectionReference: "personal",
          suggestion: "Please provide a valid email address",
        });
      }
    }

    if (profile?.phone) {
      // Basic phone validation (remove non-digits and check length)
      const phoneDigits = profile.phone.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        issues.push({
          issueType: "format",
          severity: "warning",
          message: "Phone number appears to be incomplete",
          sectionReference: "personal",
          suggestion: "Ensure phone number includes area code and number",
        });
      }
    }

    return issues;
  }

  // Check format consistency
  checkFormatConsistency(resume) {
    const issues = [];

    // Check date formats (if dates are stored as strings)
    // This is a placeholder - actual implementation would check date consistency

    // Check for inconsistent spacing or formatting
    if (resume.description) {
      const hasMultipleSpaces = /\s{2,}/.test(resume.description);
      if (hasMultipleSpaces) {
        issues.push({
          issueType: "format",
          severity: "warning",
          message: "Multiple consecutive spaces detected in description",
          sectionReference: "summary",
          suggestion: "Remove extra spaces for better formatting",
        });
      }
    }

    return issues;
  }

  // Check resume length (estimate)
  checkLength(resume) {
    const issues = [];

    // Estimate resume length based on content
    // This is a rough estimate - actual page count would require rendering
    let estimatedLength = 0;

    if (resume.description) {
      estimatedLength += resume.description.length / 500; // Rough estimate
    }

    // Add estimates for other sections
    // This is simplified - actual implementation would count rendered pages

    if (estimatedLength > this.maxResumeLength) {
      issues.push({
        issueType: "length",
        severity: "warning",
        message: `Resume appears to be longer than ${this.maxResumeLength} pages. Consider condensing to 1-2 pages.`,
        sectionReference: "all",
        suggestion: "Remove less relevant experience or reduce bullet points",
      });
    } else if (estimatedLength < this.minResumeLength) {
      issues.push({
        issueType: "length",
        severity: "info",
        message: "Resume appears to be shorter than 1 page. Consider adding more details.",
        sectionReference: "all",
        suggestion: "Add more experience, skills, or projects to strengthen your resume",
      });
    }

    return issues;
  }

  // Basic spell check (placeholder - would need actual spell checking library)
  async spellCheck(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      const issues = [];

      // Common misspellings dictionary (simplified)
      const commonMisspellings = {
        experiance: "experience",
        recieve: "receive",
        seperate: "separate",
        definately: "definitely",
        accomodate: "accommodate",
      };

      // Check description for common misspellings
      if (resume.description) {
        const words = resume.description.toLowerCase().split(/\s+/);
        words.forEach((word, index) => {
          const cleanWord = word.replace(/[^\w]/g, "");
          if (commonMisspellings[cleanWord]) {
            issues.push({
              issueType: "spelling",
              severity: "error",
              message: `Misspelled word: '${cleanWord}' should be '${commonMisspellings[cleanWord]}'`,
              sectionReference: "summary",
              suggestion: `Change '${cleanWord}' to '${commonMisspellings[cleanWord]}'`,
            });
          }
        });
      }

      return issues;
    } catch (error) {
      console.error("❌ Error spell checking resume:", error);
      throw error;
    }
  }

  // Get validation issues from database
  async getValidationIssues(resumeId) {
    try {
      const query = `
        SELECT id, resume_id, issue_type, severity, message, section_reference, suggestion, is_resolved, created_at
        FROM resume_validation_issues
        WHERE resume_id = $1 AND is_resolved = false
        ORDER BY 
          CASE severity
            WHEN 'error' THEN 1
            WHEN 'warning' THEN 2
            WHEN 'info' THEN 3
          END,
          created_at DESC
      `;

      const result = await database.query(query, [resumeId]);

      return result.rows.map((row) => ({
        id: row.id,
        resumeId: row.resume_id,
        issueType: row.issue_type,
        severity: row.severity,
        message: row.message,
        sectionReference: row.section_reference,
        suggestion: row.suggestion,
        isResolved: row.is_resolved,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("❌ Error getting validation issues:", error);
      // If table doesn't exist yet, return empty array
      if (error.message.includes("does not exist")) {
        return [];
      }
      throw error;
    }
  }

  // Save validation issues to database
  async saveValidationIssues(resumeId, issues) {
    try {
      // Delete existing unresolved issues
      const deleteQuery = `
        DELETE FROM resume_validation_issues
        WHERE resume_id = $1 AND is_resolved = false
      `;
      await database.query(deleteQuery, [resumeId]).catch(() => {
        // Table might not exist yet
      });

      // Insert new issues
      for (const issue of issues) {
        const insertQuery = `
          INSERT INTO resume_validation_issues (resume_id, issue_type, severity, message, section_reference, suggestion, is_resolved)
          VALUES ($1, $2, $3, $4, $5, $6, false)
        `;
        await database.query(insertQuery, [
          resumeId,
          issue.issueType,
          issue.severity,
          issue.message,
          issue.sectionReference || null,
          issue.suggestion || null,
        ]).catch(() => {
          // Table might not exist yet - just log
          console.log("Validation issues table not found, skipping save");
        });
      }
    } catch (error) {
      // If table doesn't exist, just log (don't throw)
      console.log("Could not save validation issues:", error.message);
    }
  }

  // Resolve validation issue
  async resolveIssue(issueId, userId) {
    try {
      // Verify user owns the resume
      const query = `
        UPDATE resume_validation_issues
        SET is_resolved = true
        WHERE id = $1 AND resume_id IN (
          SELECT id FROM resume WHERE user_id = $2
        )
        RETURNING id
      `;

      const result = await database.query(query, [issueId, userId]);

      if (result.rows.length === 0) {
        throw new Error("Issue not found or access denied");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error resolving validation issue:", error);
      throw error;
    }
  }
}

export default new ResumeValidationService();

