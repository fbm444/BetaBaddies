import database from "../database.js";
import resumeService from "./coreService.js";
import profileService from "../profileService.js";
import resumeAIAssistantService from "./aiService.js";

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
        suggestion:
          "Consider adding a professional summary to highlight your key qualifications",
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
        message:
          "Resume appears to be shorter than 1 page. Consider adding more details.",
        sectionReference: "all",
        suggestion:
          "Add more experience, skills, or projects to strengthen your resume",
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
        await database
          .query(insertQuery, [
            resumeId,
            issue.issueType,
            issue.severity,
            issue.message,
            issue.sectionReference || null,
            issue.suggestion || null,
          ])
          .catch(() => {
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

  // AI-powered resume critique
  async critiqueResume(resumeId, userId, jobDescription = null) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Get user profile for context
      const profile = await profileService.getProfileByUserId(userId);

      // Build comprehensive resume context for AI
      const resumeContext = this.buildResumeContextForAI(resume, profile);

      // Create critique prompt
      let prompt = `Please provide a comprehensive critique of this resume. Analyze the following aspects:

1. **Content Quality:**
   - Are bullet points impactful and quantified?
   - Is the summary compelling and concise?
   - Are skills relevant and well-organized?
   - Is experience described effectively?

2. **ATS Compatibility:**
   - Are keywords optimized?
   - Is formatting ATS-friendly?
   - Are section headings clear?
   - Is the structure logical?

3. **Professional Presentation:**
   - Is the tone professional?
   - Are there any grammar or spelling issues?
   - Is the length appropriate (1-2 pages)?
   - Is information well-organized?

4. **Completeness:**
   - Are all essential sections present?
   - Is contact information complete?
   - Are dates and locations consistent?
   - Is there missing critical information?

5. **Improvement Suggestions:**
   - Specific areas to strengthen
   - Action verbs to use
   - Quantifiable achievements to add
   - Skills to emphasize or add

${
  jobDescription
    ? `\n6. **Job-Specific Tailoring:**\n   - How well does this resume match the job description?\n   - What keywords from the job posting are missing?\n   - What experience should be emphasized?\n   - How can it be better tailored?\n\nTarget Job Description:\n${jobDescription}`
    : ""
}

Please provide:
- Overall assessment (strengths and weaknesses)
- Specific issues found (with severity: error, warning, or info)
- Actionable improvement suggestions
- Priority recommendations

Resume Content:
${resumeContext}`;

      try {
        const aiResponse = await resumeAIAssistantService.chat(
          [{ role: "user", content: prompt }],
          resume
        );

        // Parse AI response and extract structured feedback
        const critique = this.parseAICritique(aiResponse.message);

        // Combine with standard validation
        const standardValidation = await this.validateResume(resumeId, userId);

        return {
          ...standardValidation,
          aiCritique: critique,
          overallAssessment: aiResponse.message,
          jobSpecific: !!jobDescription,
        };
      } catch (aiError) {
        console.error(
          "❌ AI critique failed, falling back to standard validation:",
          aiError
        );
        // Fall back to standard validation if AI fails
        return await this.validateResume(resumeId, userId);
      }
    } catch (error) {
      console.error("❌ Error critiquing resume:", error);
      throw error;
    }
  }

  // Build comprehensive resume context for AI analysis
  buildResumeContextForAI(resume, profile) {
    const context = [];

    // Personal Information
    context.push("=== PERSONAL INFORMATION ===");
    if (resume.content?.personalInfo) {
      const {
        firstName,
        lastName,
        email,
        phone,
        location,
        linkedIn,
        portfolio,
      } = resume.content.personalInfo;
      context.push(`Name: ${firstName || ""} ${lastName || ""}`);
      context.push(`Email: ${email || "Not provided"}`);
      context.push(`Phone: ${phone || "Not provided"}`);
      context.push(`Location: ${location || "Not provided"}`);
      if (linkedIn) context.push(`LinkedIn: ${linkedIn}`);
      if (portfolio) context.push(`Portfolio: ${portfolio}`);
    }
    context.push("");

    // Summary
    if (resume.content?.summary) {
      context.push("=== PROFESSIONAL SUMMARY ===");
      context.push(resume.content.summary);
      context.push("");
    }

    // Experience
    if (resume.content?.experience && resume.content.experience.length > 0) {
      context.push("=== WORK EXPERIENCE ===");
      resume.content.experience.forEach((exp) => {
        context.push(`${exp.title || "N/A"} at ${exp.company || "N/A"}`);
        if (exp.location) context.push(`Location: ${exp.location}`);
        context.push(
          `Duration: ${exp.startDate || "N/A"} - ${
            exp.isCurrent ? "Present" : exp.endDate || "N/A"
          }`
        );
        if (exp.description && exp.description.length > 0) {
          exp.description.forEach((desc) => context.push(`  • ${desc}`));
        }
        context.push("");
      });
    }

    // Education
    if (resume.content?.education && resume.content.education.length > 0) {
      context.push("=== EDUCATION ===");
      resume.content.education.forEach((edu) => {
        context.push(`${edu.degree || "N/A"} from ${edu.school || "N/A"}`);
        if (edu.field) context.push(`Field: ${edu.field}`);
        if (edu.endDate) context.push(`Graduated: ${edu.endDate}`);
        if (edu.gpa) context.push(`GPA: ${edu.gpa}`);
        if (edu.honors) context.push(`Honors: ${edu.honors}`);
        context.push("");
      });
    }

    // Skills
    if (resume.content?.skills && resume.content.skills.length > 0) {
      context.push("=== SKILLS ===");
      const skillsByCategory = {};
      resume.content.skills.forEach((skill) => {
        const category = skill.category || "Other";
        if (!skillsByCategory[category]) {
          skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(skill.name);
      });
      Object.keys(skillsByCategory).forEach((category) => {
        context.push(`${category}: ${skillsByCategory[category].join(", ")}`);
      });
      context.push("");
    }

    // Projects
    if (resume.content?.projects && resume.content.projects.length > 0) {
      context.push("=== PROJECTS ===");
      resume.content.projects.forEach((proj) => {
        context.push(`${proj.name || "N/A"}`);
        if (proj.description) context.push(`  ${proj.description}`);
        if (proj.technologies && proj.technologies.length > 0) {
          context.push(`  Technologies: ${proj.technologies.join(", ")}`);
        }
        if (proj.link) context.push(`  Link: ${proj.link}`);
        context.push("");
      });
    }

    // Certifications
    if (
      resume.content?.certifications &&
      resume.content.certifications.length > 0
    ) {
      context.push("=== CERTIFICATIONS ===");
      resume.content.certifications.forEach((cert) => {
        context.push(
          `${cert.name || "N/A"} from ${cert.organization || "N/A"}`
        );
        if (cert.dateEarned) context.push(`  Earned: ${cert.dateEarned}`);
        if (cert.expirationDate)
          context.push(`  Expires: ${cert.expirationDate}`);
        context.push("");
      });
    }

    return context.join("\n");
  }

  // Parse AI critique response into structured format
  parseAICritique(aiResponse) {
    // Extract structured information from AI response
    // This is a simplified parser - could be enhanced with more sophisticated parsing
    const critique = {
      strengths: [],
      weaknesses: [],
      suggestions: [],
      priority: [],
    };

    // Try to extract sections (basic parsing)
    const lines = aiResponse.split("\n");
    let currentSection = null;

    lines.forEach((line) => {
      const lowerLine = line.toLowerCase().trim();
      if (lowerLine.includes("strength") || lowerLine.includes("strong")) {
        currentSection = "strengths";
      } else if (
        lowerLine.includes("weakness") ||
        lowerLine.includes("improve")
      ) {
        currentSection = "weaknesses";
      } else if (
        lowerLine.includes("suggestion") ||
        lowerLine.includes("recommend")
      ) {
        currentSection = "suggestions";
      } else if (
        lowerLine.includes("priority") ||
        lowerLine.includes("important")
      ) {
        currentSection = "priority";
      } else if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        const content = line.trim().substring(1).trim();
        if (content && currentSection) {
          critique[currentSection].push(content);
        }
      }
    });

    return critique;
  }

  // AI-powered resume validation with grading
  async validateResumeWithGrading(resumeId, userId, currentResume = null) {
    try {
      // Use currentResume if provided (may have unsaved changes), otherwise fetch from DB
      let resume = currentResume;
      if (!resume) {
        resume = await resumeService.getResumeById(resumeId, userId);
      }
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Get user profile for context
      const profile = await profileService.getProfileByUserId(userId);

      // Build comprehensive resume context for AI
      const resumeContext = this.buildResumeContextForAI(resume, profile);

      // Create grading prompt
      const prompt = `You are an expert resume reviewer. Analyze this resume and provide a comprehensive evaluation with numerical scores.

CRITICAL: Write ALL feedback, summaries, highlights, and recommendations in FIRST PERSON, speaking directly to the user. Use "you", "your", "I recommend", etc. DO NOT refer to the user in third person (avoid "the candidate", "the applicant", "their resume", etc.).

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "overallStatus": "<excellent|good|needs-improvement|poor>",
  "summary": "<2-3 sentence overall assessment written in first person, speaking directly to the user>",
  "highlights": ["<positive point 1 written in first person>", "<positive point 2 written in first person>", ...],
  "sectionGrades": [
    {
      "section": "personal",
      "score": <number 0-20>,
      "maxScore": 20,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "summary",
      "score": <number 0-15>,
      "maxScore": 15,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "experience",
      "score": <number 0-25>,
      "maxScore": 25,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "education",
      "score": <number 0-15>,
      "maxScore": 15,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "skills",
      "score": <number 0-15>,
      "maxScore": 15,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "projects",
      "score": <number 0-5>,
      "maxScore": 5,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    },
    {
      "section": "certifications",
      "score": <number 0-5>,
      "maxScore": 5,
      "percentage": <number 0-100>,
      "status": "<excellent|good|needs-improvement|poor>",
      "feedback": ["<specific feedback 1 written in first person>", "<specific feedback 2 written in first person>", ...]
    }
  ],
  "recommendations": ["<recommendation 1 written in first person>", "<recommendation 2 written in first person>", ...]
}

WRITING STYLE EXAMPLES:
✅ GOOD (First Person): "Your summary effectively highlights your key qualifications.", "I recommend adding more quantified achievements to your experience section.", "You have strong technical skills that match industry standards."
❌ BAD (Third Person): "The candidate's summary effectively highlights their key qualifications.", "The applicant should add more quantified achievements.", "Their technical skills match industry standards."

Scoring Guidelines:
- excellent: 80-100%
- good: 60-79%
- needs-improvement: 40-59%
- poor: 0-39%

Evaluate each section based on:
- Completeness (all required fields present)
- Quality (impactful, quantified achievements)
- ATS compatibility (keywords, formatting)
- Professional presentation (tone, grammar, clarity)
- Relevance and organization

Resume Content:
${resumeContext}`;

      try {
        console.log("🔍 Starting AI validation with grading...");
        const aiResponse = await resumeAIAssistantService.chat(
          [{ role: "user", content: prompt }],
          resume,
          null,
          null,
          {
            jsonMode: true, // Force JSON response
            maxTokens: 2000, // Increase token limit for detailed responses
            temperature: 0.3, // Lower temperature for more consistent JSON
          }
        );

        console.log(
          "✅ AI response received, length:",
          aiResponse.message?.length || 0
        );

        // Parse JSON response
        let result;
        try {
          // Since we're using jsonMode, the response should be valid JSON
          let jsonString = aiResponse.message;

          // Remove any markdown code blocks if present
          jsonString = jsonString
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();

          // Try to extract JSON if wrapped in text
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
            console.log("✅ Successfully parsed AI JSON response");
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (parseError) {
          console.error("❌ Failed to parse AI response as JSON:", parseError);
          console.error(
            "Response content (first 500 chars):",
            aiResponse.message?.substring(0, 500)
          );
          // Fallback: create a basic structure
          console.log("⚠️ Using fallback grading");
          result = this.createFallbackGrading(resume);
        }

        // Validate result structure
        if (!result.sectionGrades || !Array.isArray(result.sectionGrades)) {
          console.error("❌ Invalid result structure - missing sectionGrades");
          result = this.createFallbackGrading(resume);
        }

        // Calculate overall percentage from section scores
        const totalScore = result.sectionGrades.reduce(
          (sum, grade) => sum + (grade.score || 0),
          0
        );
        const totalMaxScore = result.sectionGrades.reduce(
          (sum, grade) => sum + (grade.maxScore || 0),
          0
        );
        const overallPercentage =
          totalMaxScore > 0
            ? Math.round((totalScore / totalMaxScore) * 100)
            : 0;

        // Determine overall status
        let overallStatus = "poor";
        if (overallPercentage >= 80) overallStatus = "excellent";
        else if (overallPercentage >= 60) overallStatus = "good";
        else if (overallPercentage >= 40) overallStatus = "needs-improvement";

        // Ensure all section grades have required fields
        const validatedSectionGrades = result.sectionGrades.map((grade) => ({
          section: grade.section || "unknown",
          score: grade.score ?? 0,
          maxScore: grade.maxScore ?? 20,
          percentage:
            grade.percentage ??
            Math.round(((grade.score || 0) / (grade.maxScore || 20)) * 100),
          status:
            grade.status ||
            (grade.percentage >= 80
              ? "excellent"
              : grade.percentage >= 60
              ? "good"
              : grade.percentage >= 40
              ? "needs-improvement"
              : "poor"),
          feedback: Array.isArray(grade.feedback)
            ? grade.feedback
            : grade.feedback
            ? [grade.feedback]
            : [],
        }));

        const response = {
          overallScore: result.overallScore ?? totalScore,
          overallPercentage,
          overallStatus: result.overallStatus || overallStatus,
          summary: result.summary || "Resume analysis completed.",
          highlights: Array.isArray(result.highlights) ? result.highlights : [],
          sectionGrades: validatedSectionGrades,
          recommendations: Array.isArray(result.recommendations)
            ? result.recommendations
            : [],
        };

        console.log("✅ Validation complete:", {
          overallPercentage,
          overallStatus,
          sectionCount: validatedSectionGrades.length,
        });

        return response;
      } catch (aiError) {
        console.error("❌ AI grading failed, using fallback:", aiError);
        console.error("Error details:", aiError.message);
        // Fallback to basic grading
        return this.createFallbackGrading(resume);
      }
    } catch (error) {
      console.error("❌ Error validating resume with grading:", error);
      throw error;
    }
  }

  // Create fallback grading structure
  createFallbackGrading(resume) {
    console.log(
      "📊 Creating fallback grading for resume:",
      resume?.id || "unknown"
    );

    const sections = [
      { id: "personal", maxScore: 20 },
      { id: "summary", maxScore: 15 },
      { id: "experience", maxScore: 25 },
      { id: "education", maxScore: 15 },
      { id: "skills", maxScore: 15 },
      { id: "projects", maxScore: 5 },
      { id: "certifications", maxScore: 5 },
    ];

    const resumeContent = resume?.content || {};

    const sectionGrades = sections.map((section) => {
      let score = 0;
      let feedback = [];

      if (section.id === "personal") {
        const personalInfo = resumeContent.personalInfo || {};
        if (personalInfo.firstName && personalInfo.lastName) score += 5;
        if (personalInfo.email) score += 5;
        if (personalInfo.phone) score += 5;
        if (personalInfo.location) score += 5;
        if (!personalInfo.email) feedback.push("Add your email address");
        if (!personalInfo.phone) feedback.push("Add your phone number");
        if (!personalInfo.location) feedback.push("Add your location");
      } else if (section.id === "summary") {
        const summary = resumeContent.summary || "";
        if (summary && summary.length > 100) score = 12;
        else if (summary && summary.length > 50) score = 8;
        else if (summary) score = 5;
        if (!summary || summary.length < 50)
          feedback.push(
            "Add a compelling professional summary (2-3 sentences) that highlights your key qualifications"
          );
      } else {
        // For experience, education, skills, projects, certifications
        const content = resumeContent[section.id] || [];
        if (Array.isArray(content)) {
          if (content.length > 0) {
            // Score based on number of entries and quality
            score = Math.min(
              content.length * (section.maxScore / 3),
              section.maxScore
            );
            if (section.id === "experience" && content.length < 2) {
              feedback.push(
                "Add more work experience entries to strengthen your resume"
              );
            } else if (section.id === "skills" && content.length < 5) {
              feedback.push(
                "Add more relevant skills to showcase your expertise"
              );
            }
          } else {
            feedback.push(`Add ${section.id} entries to complete your resume`);
          }
        } else {
          feedback.push(`Add ${section.id} content to complete your resume`);
        }
      }

      const percentage = Math.round((score / section.maxScore) * 100);
      let status = "poor";
      if (percentage >= 80) status = "excellent";
      else if (percentage >= 60) status = "good";
      else if (percentage >= 40) status = "needs-improvement";

      return {
        section: section.id,
        score,
        maxScore: section.maxScore,
        percentage,
        status,
        feedback: feedback.length > 0 ? feedback : ["This section looks good"],
      };
    });

    const totalScore = sectionGrades.reduce(
      (sum, grade) => sum + grade.score,
      0
    );
    const totalMaxScore = sectionGrades.reduce(
      (sum, grade) => sum + grade.maxScore,
      0
    );
    const overallPercentage =
      totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    let overallStatus = "poor";
    if (overallPercentage >= 80) overallStatus = "excellent";
    else if (overallPercentage >= 60) overallStatus = "good";
    else if (overallPercentage >= 40) overallStatus = "needs-improvement";

    console.log("📊 Fallback grading complete:", {
      overallPercentage,
      overallStatus,
      totalScore,
      totalMaxScore,
    });

    return {
      overallScore: totalScore,
      overallPercentage,
      overallStatus,
      summary:
        "I've completed analyzing your resume. Review the section grades below for specific feedback on how to improve each section.",
      highlights: [],
      sectionGrades,
      recommendations: [
        "Review the section-specific feedback above to identify areas for improvement",
      ],
    };
  }
}

export default new ResumeValidationService();
