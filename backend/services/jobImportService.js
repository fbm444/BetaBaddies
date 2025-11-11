import { URL } from "url";
import resumeAIAssistantService from "./resumes/aiService.js";

class JobImportService {
  constructor() {
    this.supportedJobBoards = {
      linkedin: { domains: ["linkedin.com", "www.linkedin.com"] },
      indeed: { domains: ["indeed.com", "www.indeed.com"] },
      glassdoor: { domains: ["glassdoor.com", "www.glassdoor.com"] },
    };
  }

  validateUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  detectJobBoard(urlString) {
    try {
      const url = new URL(urlString);
      const domain = url.hostname.replace(/^www\./, "");
    for (const [board, config] of Object.entries(this.supportedJobBoards)) {
      if (config.domains.some((d) => domain.includes(d))) {
        return board;
      }
    }
      return "other";
    } catch (error) {
      return "other";
    }
  }

  async fetchContent(urlString) {
    try {
      const response = await fetch(urlString, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        console.warn(
          "[JobImportService] Fetch failed with status:",
          response.status
        );
        return null;
      }

      const text = await response.text();
      return text && text.length > 0 ? text : null;
    } catch (error) {
      console.warn("[JobImportService] Fetch error:", error.message);
      return null;
    }
  }

  async extractWithAI(urlString, rawContent, jobBoardHint) {
    if (!resumeAIAssistantService.openai) {
      return null;
    }

    const snippet =
      rawContent && rawContent.length > 20000
        ? rawContent.slice(0, 20000)
        : rawContent || "Content unavailable.";

    const prompt = `
You are an assistant that extracts job posting details.
Return ONLY JSON with this exact shape:
{
  "title": "Job Title or null",
  "company": "Company Name or null",
  "location": "City, State or Remote or null",
  "jobType": "Full-time | Contract | Remote | Hybrid | null",
  "salaryMin": 0,
  "salaryMax": 0,
  "currency": "USD | EUR | ... | null",
  "description": "Clean job description or null",
  "skills": ["Skill 1", "Skill 2"],
  "jobBoard": "linkedin | indeed | glassdoor | other"
}

Rules:
- Use null for unknown fields.
- "skills" must be an array of strings (empty array if not obvious).
- Infer jobBoard from the URL when possible; otherwise "other".
- Do not fabricate information.
- Remove navigation/footer noise from description.

Job URL: ${urlString}

Job Posting Content:
"""
${snippet}
"""`;

    try {
      const aiResponse = await resumeAIAssistantService.chat(
        [
          {
            role: "user",
            content: prompt,
          },
        ],
        null,
        null,
        null,
        {
          jsonMode: true,
          maxTokens: 600,
          temperature: 0.2,
        }
      );

      const jsonMatch = aiResponse?.message?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("[JobImportService] AI response missing JSON payload.");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || null,
        company: parsed.company || null,
        location: parsed.location || null,
        jobType: parsed.jobType || null,
        salaryMin: parsed.salaryMin || null,
        salaryMax: parsed.salaryMax || null,
        currency: parsed.currency || null,
        description: parsed.description || null,
        jobBoard: parsed.jobBoard || jobBoardHint || "other",
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((skill) => typeof skill === "string")
          : [],
      };
    } catch (error) {
      console.error("[JobImportService] AI extraction failed:", error.message);
      return null;
    }
  }

  heuristicFallback(rawContent, jobBoardHint) {
    if (!rawContent) {
      return {
        title: null,
        company: null,
        location: null,
        jobType: null,
        salaryMin: null,
        salaryMax: null,
        currency: null,
        description: null,
        jobBoard: jobBoardHint || "other",
        skills: [],
      };
    }

    const text = rawContent.replace(/\s+/g, " ");
    const titleMatch = text.match(/Title[:\-]\s*([^\n|]+)/i);
    const companyMatch = text.match(/Company[:\-]\s*([^\n|]+)/i);
    const locationMatch = text.match(/Location[:\-]\s*([^\n|]+)/i);
    const descriptionStart = text.search(
      /(Job Description|Responsibilities|About the role)/i
    );

    return {
      title: titleMatch ? titleMatch[1].trim() : null,
      company: companyMatch ? companyMatch[1].trim() : null,
      location: locationMatch ? locationMatch[1].trim() : null,
      jobType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      description:
        descriptionStart >= 0
          ? text.slice(descriptionStart).slice(0, 4000).trim()
          : null,
      jobBoard: jobBoardHint || "other",
      skills: [],
    };
  }

  async importJobFromUrl(urlString) {
    if (!this.validateUrl(urlString)) {
      return {
        success: false,
        error: "Invalid URL format",
        data: {
          url: urlString,
          importStatus: "failed",
        },
      };
    }

    const jobBoard = this.detectJobBoard(urlString);
    const rawContent = await this.fetchContent(urlString);

    const extracted =
      (await this.extractWithAI(urlString, rawContent, jobBoard)) ||
      this.heuristicFallback(rawContent, jobBoard);

    const description =
      extracted.description?.replace(/\n{3,}/g, "\n\n").trim() || null;
    const title = extracted.title?.trim() || null;
    const company = extracted.company?.trim() || null;
    const location = extracted.location?.trim() || null;

    const importStatus =
      title && company && description
        ? "success"
        : title || company || description
        ? "partial"
        : "failed";

    return {
      success: importStatus !== "failed",
      data: {
        title,
        company,
        location,
        description,
        url: urlString,
        jobBoard: extracted.jobBoard,
        jobType: extracted.jobType,
        salaryMin: extracted.salaryMin,
        salaryMax: extracted.salaryMax,
        currency: extracted.currency,
        skills: extracted.skills,
        importStatus,
      },
    };
  }
}

export default new JobImportService();
