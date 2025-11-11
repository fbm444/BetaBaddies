import crypto from "crypto";
import OpenAI from "openai";
import database from "./database.js";
import companyResearchService from "./companyResearchService.js";

class CompanyInterviewInsightsService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    this.cacheTtlHours = parseInt(
      process.env.INTERVIEW_INSIGHTS_CACHE_HOURS || "168",
      10
    ); // default 7 days

    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  buildCompanyKey(companyName) {
    return (companyName || "").trim().toLowerCase();
  }

  buildRoleKey(roleTitle) {
    return (roleTitle || "").trim().toLowerCase();
  }

  normalizeCompanyName(companyName) {
    if (!companyName || typeof companyName !== "string") {
      throw new Error("Company name is required to request interview insights");
    }
    return companyName.trim();
  }

  async loadJob(jobId, userId) {
    const result = await database.query(
      `SELECT id, user_id, company, title, job_description, industry, job_type,
              location, application_deadline
         FROM job_opportunities
        WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    if (userId && result.rows[0].user_id !== userId) {
      throw new Error("FORBIDDEN");
    }

    return result.rows[0];
  }

  async fetchCached(companyKey, roleKey) {
    const result = await database.query(
      `SELECT *
         FROM company_interview_insights
        WHERE company_key = $1 AND role_key = $2
        LIMIT 1`,
      [companyKey, roleKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  hasExpired(record) {
    if (!record?.expires_at) {
      return false;
    }
    return new Date(record.expires_at) <= new Date();
  }

  calculateExpiry() {
    const expires = new Date();
    expires.setHours(expires.getHours() + this.cacheTtlHours);
    return expires;
  }

  hashPrompt(prompt) {
    return crypto.createHash("sha256").update(prompt).digest("hex");
  }

  async saveInsights({
    companyName,
    companyKey,
    requestedRole,
    roleKey,
    jobId,
    payload,
    promptHash,
    expiresAt,
    lastError = null,
  }) {
    await database.query(
      `INSERT INTO company_interview_insights
         (company_name, company_key, requested_role, role_key, job_id, payload, source,
          prompt_hash, expires_at, last_error)
       VALUES ($1, $2, $3, $4, $5, $6, 'openai', $7, $8, $9)
       ON CONFLICT (company_key, role_key)
       DO UPDATE
         SET company_name = EXCLUDED.company_name,
             requested_role = EXCLUDED.requested_role,
             job_id = EXCLUDED.job_id,
             payload = EXCLUDED.payload,
             source = EXCLUDED.source,
             prompt_hash = EXCLUDED.prompt_hash,
             expires_at = EXCLUDED.expires_at,
             last_error = EXCLUDED.last_error,
             updated_at = CURRENT_TIMESTAMP
       `,
      [
        companyName,
        companyKey,
        requestedRole || null,
        roleKey,
        jobId || null,
        JSON.stringify(payload),
        promptHash,
        expiresAt,
        lastError,
      ]
    );
  }

  async markGenerationError(companyKey, roleKey, errorMessage) {
    await database.query(
      `UPDATE company_interview_insights
          SET last_error = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE company_key = $1 AND role_key = $2`,
      [companyKey, roleKey, errorMessage]
    );
  }

  async getCompanyResearch(jobId) {
    if (!jobId) return null;
    try {
      return await companyResearchService.getCompanyInfoByJobId(jobId);
    } catch (err) {
      console.warn(
        "[CompanyInterviewInsightsService] Failed to load company research:",
        err.message
      );
      return null;
    }
  }

  buildPrompt({ companyName, roleTitle, job, companyInfo }) {
    const sections = [];
    sections.push(`Company: ${companyName}`);
    if (roleTitle) {
      sections.push(`Role: ${roleTitle}`);
    }
    if (job?.job_description) {
      sections.push(
        `Job Description:\n${job.job_description.substring(0, 1800)}`
      );
    }
    if (job?.industry) {
      sections.push(`Industry: ${job.industry}`);
    }
    if (job?.job_type) {
      sections.push(`Job Type: ${job.job_type}`);
    }
    if (job?.location) {
      sections.push(`Location: ${job.location}`);
    }
    if (job?.application_deadline) {
      sections.push(
        `Application Deadline: ${new Date(
          job.application_deadline
        ).toISOString()}`
      );
    }
    if (companyInfo) {
      if (companyInfo.size) {
        sections.push(`Company Size: ${companyInfo.size}`);
      }
      if (companyInfo.industry) {
        sections.push(`Company Industry: ${companyInfo.industry}`);
      }
      if (companyInfo.location) {
        sections.push(`Company Locations: ${companyInfo.location}`);
      }
      if (companyInfo.description) {
        sections.push(`Company Description:\n${companyInfo.description}`);
      }
    }

    return `You are an expert interview preparation coach specializing in technology sector companies.

Using reputable public information and your domain knowledge, prepare interview guidance for the company and role below. If concrete company-specific data is limited, provide clearly-labeled best practices tailored to the role and industry rather than making up facts.

${sections.join("\n\n")}

Respond ONLY with valid JSON matching this TypeScript type:
{
  "process_overview": string,
  "stages": Array<{
    "stage": string,
    "what_to_expect": string,
    "duration": string | null
  }>,
  "timeline_expectations": string,
  "interview_formats": string[],
  "common_questions": Array<{
    "question": string,
    "category": "behavioral" | "technical" | "system_design" | "product" | "culture" | "other",
    "why_asked": string
  }>,
  "interviewer_profiles": Array<{
    "role": string,
    "focus": string,
    "tips": string
  }>,
  "preparation_recommendations": string[],
  "success_tips": string[],
  "checklist": string[],
  "additional_resources": string[]
}

Requirements:
- If information is inferred or generalized, explicitly note it as such.
- Keep entries actionable and concise.
- Provide at least 4 preparation recommendations and 6 checklist items.
- If a field is truly unknown, provide a best-practice recommendation instead of leaving it empty.
`;
  }

  parseJsonResponse(content) {
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const trimmed = content.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("OpenAI response did not include JSON object");
    }

    const jsonString = trimmed.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  }

  validatePayload(payload) {
    const normalized =
      payload && typeof payload === "object" ? { ...payload } : {};

    if (!normalized.process_overview || typeof normalized.process_overview !== "string") {
      normalized.process_overview = "";
    }
    if (
      !normalized.timeline_expectations ||
      typeof normalized.timeline_expectations !== "string"
    ) {
      normalized.timeline_expectations = "";
    }

    const requiredArrays = [
      "stages",
      "interview_formats",
      "common_questions",
      "interviewer_profiles",
      "preparation_recommendations",
      "success_tips",
      "checklist",
      "additional_resources",
    ];
    for (const key of requiredArrays) {
      if (!Array.isArray(normalized[key])) {
        normalized[key] = [];
      }
    }
    return normalized;
  }

  async generateInsightsWithOpenAI(prompt) {
    if (!this.openai) {
      throw new Error(
        "OpenAI API key is not configured. Cannot generate interview insights."
      );
    }

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      temperature: 0.4,
      max_tokens: 1600,
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous interview preparation assistant. Provide structured, accurate, and actionable guidance.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const parsed = this.parseJsonResponse(content);
    return this.validatePayload(parsed);
  }

  buildMetadata(row, { fromCache }) {
    if (!row) {
      return {
        companyName: null,
        requestedRole: null,
        generatedAt: null,
        expiresAt: null,
        source: null,
        promptHash: null,
        lastError: null,
        fromCache,
      };
    }

    return {
      companyName: row.company_name,
      requestedRole: row.requested_role,
      generatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      source: row.source,
      promptHash: row.prompt_hash,
      lastError: row.last_error,
      fromCache,
    };
  }

  async getInsightsForJob(jobId, userId, options = {}) {
    const { roleTitle, forceRefresh = false } = options;
    const job = await this.loadJob(jobId, userId);

    if (!job) {
      throw new Error("NOT_FOUND");
    }

    const companyName = this.normalizeCompanyName(job.company);
    const roleName = roleTitle || job.title || "Interview Candidate";

    return this.getInsights({
      companyName,
      roleTitle: roleName,
      jobId: job.id,
      job,
      forceRefresh,
    });
  }

  async getInsights({
    companyName,
    roleTitle,
    jobId,
    job = null,
    forceRefresh = false,
  }) {
    const normalizedCompanyName = this.normalizeCompanyName(companyName);
    const companyKey = this.buildCompanyKey(normalizedCompanyName);
    const roleKey = this.buildRoleKey(roleTitle);

    const cached = await this.fetchCached(companyKey, roleKey);
    const cacheValid = cached && !this.hasExpired(cached);

    if (cached && !forceRefresh && cacheValid) {
      return {
        insights: this.validatePayload(cached.payload),
        metadata: this.buildMetadata(cached, { fromCache: true }),
      };
    }

    let companyInfo = null;
    if (!job && jobId) {
      job = await this.loadJob(jobId);
    }

    if (jobId) {
      companyInfo = await this.getCompanyResearch(jobId);
    }

    const prompt = this.buildPrompt({
      companyName: normalizedCompanyName,
      roleTitle,
      job,
      companyInfo,
    });

    try {
      const payload = await this.generateInsightsWithOpenAI(prompt);
      const expiresAt = this.calculateExpiry();
      const promptHash = this.hashPrompt(prompt);

      await this.saveInsights({
        companyName: normalizedCompanyName,
        companyKey,
        requestedRole: roleTitle,
        roleKey,
        jobId,
        payload,
        promptHash,
        expiresAt,
        lastError: null,
      });

      const latest = await this.fetchCached(companyKey, roleKey);

      return {
        insights: this.validatePayload(payload),
        metadata: this.buildMetadata(latest || cached, { fromCache: false }),
      };
    } catch (err) {
      console.error(
        "[CompanyInterviewInsightsService] Failed to generate interview insights:",
        err
      );

      const fallbackPayload = this.validatePayload(
        cached?.payload ? { ...cached.payload } : {}
      );

      await this.saveInsights({
        companyName: normalizedCompanyName,
        companyKey,
        requestedRole: roleTitle,
        roleKey,
        jobId,
        payload: fallbackPayload,
        promptHash: cached?.prompt_hash || null,
        expiresAt: cached?.expires_at || this.calculateExpiry(),
        lastError: err.message || "Unknown error",
      });

      const latest = await this.fetchCached(companyKey, roleKey);

      if (latest?.payload && Object.keys(latest.payload).length > 0) {
        // Return cached data with error metadata so UI can display fallback
        const metadata = this.buildMetadata(latest, {
          fromCache: true,
        });
        metadata.lastError = err.message;
        return {
          insights: this.validatePayload(latest.payload),
          metadata,
        };
      }

      throw err;
    }
  }
}

export default new CompanyInterviewInsightsService();


