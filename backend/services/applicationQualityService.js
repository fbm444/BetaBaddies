import database from "./database.js";
import OpenAI from "openai";

class ApplicationQualityService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_API_URL;
    this.openai = apiKey
      ? new OpenAI({
          apiKey,
          ...(baseURL && { baseURL }),
        })
      : null;
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  /**
   * Score the quality of an application for a given job.
   * This will fetch job + documents, call AI, compute overall score,
   * persist to application_quality_scores, and return the record.
   */
  async scoreApplication(userId, jobOpportunityId, options = {}) {
    // Fetch job details
    const jobRes = await database.query(
      `
        SELECT 
          jo.id,
          jo.title,
          jo.company,
          jo.job_description,
          jo.industry,
          jo.job_type,
          jo.application_source,
          jo.application_method
        FROM job_opportunities jo
        WHERE jo.id = $1 AND jo.user_id = $2
        LIMIT 1
      `,
      [jobOpportunityId, userId]
    );

    if (jobRes.rows.length === 0) {
      throw new Error("Job opportunity not found");
    }

    const job = jobRes.rows[0];

    // Fetch primary / provided documents
    const { resumeDocumentId, coverLetterDocumentId, linkedinUrl } = options;

    const resume = await this.getDocumentContent(
      userId,
      resumeDocumentId,
      "resume"
    );
    const coverLetter = await this.getDocumentContent(
      userId,
      coverLetterDocumentId,
      "cover_letter"
    );

    const aiResult = await this.generateQualityAnalysis({
      job,
      resume,
      coverLetter,
      linkedinUrl,
    });

    const {
      alignmentScore = 0,
      formatScore = 0,
      consistencyScore = 0,
      missingKeywords = [],
      missingSkills = [],
      issues = [],
      suggestions = [],
      summary = "",
      modelVersion = "v1",
    } = aiResult || {};

    // Weighted overall score
    const overall =
      0.6 * alignmentScore +
      0.2 * formatScore +
      0.2 * consistencyScore;

    const insertRes = await database.query(
      `
        INSERT INTO application_quality_scores (
          user_id,
          job_opportunity_id,
          resume_document_id,
          cover_letter_document_id,
          linkedin_url,
          overall_score,
          alignment_score,
          format_score,
          consistency_score,
          missing_keywords,
          missing_skills,
          issues,
          suggestions,
          summary,
          model_version
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *
      `,
      [
        userId,
        jobOpportunityId,
        resume?.id || null,
        coverLetter?.id || null,
        linkedinUrl || null,
        overall,
        alignmentScore,
        formatScore,
        consistencyScore,
        JSON.stringify(missingKeywords || []),
        JSON.stringify(missingSkills || []),
        JSON.stringify(issues || []),
        JSON.stringify(suggestions || []),
        summary || null,
        modelVersion,
      ]
    );

    return insertRes.rows[0];
  }

  async getLatestScore(userId, jobOpportunityId) {
    const res = await database.query(
      `
        SELECT *
        FROM application_quality_scores
        WHERE user_id = $1 AND job_opportunity_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId, jobOpportunityId]
    );
    return res.rows[0] || null;
  }

  async getStats(userId) {
    const res = await database.query(
      `
        SELECT
          AVG(overall_score) AS avg_score,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY overall_score) AS p90_score,
          MAX(overall_score) AS max_score
        FROM application_quality_scores
        WHERE user_id = $1
      `,
      [userId]
    );
    return res.rows[0] || null;
  }

  async getHistory(userId, jobOpportunityId) {
    const res = await database.query(
      `
        SELECT *
        FROM application_quality_scores
        WHERE user_id = $1 AND job_opportunity_id = $2
        ORDER BY created_at ASC
      `,
      [userId, jobOpportunityId]
    );
    return res.rows || [];
  }

  async getDocumentContent(userId, explicitId, type) {
    const params = [userId];
    let query = `
      SELECT id, document_name, file_path
      FROM application_documents
      WHERE user_id = $1
        AND document_type = $2
    `;
    params.push(type);

    if (explicitId) {
      query += " AND id = $3";
      params.push(explicitId);
    } else {
      query += " AND is_primary = true";
    }

    query += " ORDER BY created_at DESC LIMIT 1";

    const res = await database.query(query, params);
    return res.rows[0] || null;
  }

  async generateQualityAnalysis({ job, resume, coverLetter, linkedinUrl }) {
    if (!this.openai) {
      // Basic fallback – no AI available
      return {
        alignmentScore: 60,
        formatScore: 70,
        consistencyScore: 70,
        missingKeywords: [],
        missingSkills: [],
        issues: [],
        suggestions: [
          {
            id: "fallback-1",
            title: "Customize resume to the job description",
            description:
              "Highlight the most relevant skills and experiences that match the job requirements.",
            priority: "high",
            category: "alignment",
            estimatedImpact: 20,
          },
        ],
        summary:
          "Baseline quality estimate. Configure OPENAI_API_KEY for detailed analysis.",
        modelVersion: "fallback",
      };
    }

    const systemPrompt =
      "You are an assistant that scores job application quality. " +
      "Return ONLY JSON with numeric scores (0-100) and structured suggestions.";

    const userPrompt = `
Job:
- Title: ${job.title}
- Company: ${job.company}
- Industry: ${job.industry || "N/A"}
- Job type: ${job.job_type || "N/A"}
- Source: ${job.application_source || "N/A"}
- Method: ${job.application_method || "N/A"}

Job Description:
${job.job_description || "N/A"}

Resume (summary information, not full file path):
${resume ? `Name: ${resume.document_name}` : "Not provided"}

Cover Letter:
${coverLetter ? `Name: ${coverLetter.document_name}` : "Not provided"}

LinkedIn:
${linkedinUrl || "Not provided"}

Please analyze:
- Alignment between materials and job requirements.
- Missing keywords/skills/experiences.
- Formatting/typos/inconsistencies in a generic sense.
- Provide prioritized suggestions.

Return JSON with this shape:
{
  "alignmentScore": number,
  "formatScore": number,
  "consistencyScore": number,
  "missingKeywords": [{ "keyword": string, "importance": "high" | "medium" | "low" }],
  "missingSkills": [{ "skill": string, "importance": "high" | "medium" | "low" }],
  "issues": [{ "type": string, "description": string, "severity": "high" | "medium" | "low", "location": string }],
  "suggestions": [{ "id": string, "title": string, "description": string, "priority": "high" | "medium" | "low", "category": string, "estimatedImpact": number }],
  "summary": string,
  "modelVersion": string
}
    `.trim();

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0].message.content;
    try {
      return JSON.parse(content || "{}");
    } catch (e) {
      console.error("Failed to parse application quality JSON:", e, content);
      return null;
    }
  }
}

export default new ApplicationQualityService();


