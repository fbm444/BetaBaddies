import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ResumeParseService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;

    // Initialize OpenAI client
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error("❌ Error extracting text from PDF:", error);
      throw new Error("Failed to extract text from PDF");
    }
  }

  /**
   * Extract text from DOCX file
   */
  async extractTextFromDOCX(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    } catch (error) {
      console.error("❌ Error extracting text from DOCX:", error);
      throw new Error("Failed to extract text from DOCX");
    }
  }

  /**
   * Extract text from resume file based on file extension
   */
  async extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".pdf") {
      return await this.extractTextFromPDF(filePath);
    } else if (ext === ".docx" || ext === ".doc") {
      return await this.extractTextFromDOCX(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Parse resume text using AI (OpenAI)
   */
  async parseResumeWithAI(resumeText) {
    if (!this.openaiApiKey || !this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `You are an expert at parsing resumes. Extract ONLY the information that is explicitly stated in the following resume text. DO NOT infer, assume, or make up any information. Return it as a JSON object with the following structure:

{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string (optional)",
    "location": "string (optional)",
    "linkedIn": "string (optional)",
    "portfolio": "string (optional)"
  },
  "summary": "string (optional)",
  "experience": [
    {
      "id": "string (generate unique ID)",
      "title": "string",
      "company": "string",
      "location": "string (optional)",
      "startDate": "string (YYYY-MM format)",
      "endDate": "string (YYYY-MM format or 'Present')",
      "isCurrent": "boolean",
      "description": ["string (array of bullet points)"]
    }
  ],
  "education": [
    {
      "id": "string (generate unique ID)",
      "school": "string",
      "degree": "string",
      "field": "string (optional)",
      "startDate": "string (YYYY-MM format, optional)",
      "endDate": "string (YYYY-MM format)",
      "gpa": "number (optional)",
      "honors": "string (optional)"
    }
  ],
  "skills": [
    {
      "id": "string (generate unique ID)",
      "name": "string",
      "category": "string (e.g., 'Technical', 'Soft Skills', 'Languages')",
      "proficiency": "string (optional, e.g., 'Expert', 'Advanced', 'Intermediate', 'Beginner')"
    }
  ],
  "projects": [
    {
      "id": "string (generate unique ID)",
      "name": "string",
      "description": "string",
      "technologies": ["string (array, optional)"],
      "link": "string (optional)"
    }
  ],
  "certifications": [
    {
      "id": "string (generate unique ID)",
      "name": "string",
      "organization": "string",
      "dateEarned": "string (YYYY-MM format)",
      "expirationDate": "string (YYYY-MM format, optional)"
    }
  ]
}

CRITICAL RULES - READ CAREFULLY:
1. **ONLY extract information that is EXPLICITLY stated in the resume text**
2. **DO NOT infer, assume, guess, or make up any information**
3. **DO NOT add information that is not in the resume text**
4. **If a field is not found in the resume, omit it entirely or use null - DO NOT make up values**
5. **For dates, extract exactly as written. If only year is given, use YYYY-01 format. If month and year, use YYYY-MM format**
6. **For experience endDate, use "Present" ONLY if explicitly stated (e.g., "Present", "Current", "Now")**
7. **For descriptions, extract ONLY the exact bullet points or text from the resume - DO NOT paraphrase or expand**
8. **For skills, extract ONLY skills that are explicitly listed - DO NOT infer skills from job descriptions**
9. **For education, extract ONLY what is written - DO NOT assume degree types or fields of study**
10. **If information is ambiguous or unclear, use null or omit the field - DO NOT guess**
11. **Generate unique IDs for each item (use UUID format or simple incremental IDs)**
12. **Return ONLY valid JSON, no additional text or explanation**

Resume text:
${resumeText}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4o for better accuracy
        messages: [
          {
            role: "system",
            content:
              "You are a resume parsing expert. Your job is to extract ONLY the information explicitly stated in the resume text. DO NOT infer, assume, or make up any information. If information is not explicitly stated, omit it or use null. Always return valid JSON only, no additional text or explanation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.0, // Zero temperature for maximum accuracy and consistency - no creativity
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      // Parse the JSON response
      const parsedResume = JSON.parse(content);

      // Validate and clean the parsed data
      return this.validateAndCleanParsedResume(parsedResume);
    } catch (error) {
      console.error("❌ Error parsing resume with AI:", error);
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate and clean parsed resume data
   */
  validateAndCleanParsedResume(parsedData) {
    const cleaned = {
      personalInfo: {
        firstName: parsedData.personalInfo?.firstName || "",
        lastName: parsedData.personalInfo?.lastName || "",
        email: parsedData.personalInfo?.email || "",
        phone: parsedData.personalInfo?.phone || undefined,
        location: parsedData.personalInfo?.location || undefined,
        linkedIn: parsedData.personalInfo?.linkedIn || undefined,
        portfolio: parsedData.personalInfo?.portfolio || undefined,
      },
      summary: parsedData.summary || undefined,
      experience: (parsedData.experience || []).map((exp) => ({
        id:
          exp.id ||
          `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: exp.title || "",
        company: exp.company || "",
        location: exp.location || undefined,
        startDate: exp.startDate || "",
        endDate: exp.endDate === "Present" ? undefined : exp.endDate,
        isCurrent: exp.isCurrent || exp.endDate === "Present" || false,
        description: Array.isArray(exp.description) ? exp.description : [],
      })),
      education: (parsedData.education || []).map((edu) => ({
        id:
          edu.id ||
          `edu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        school: edu.school || "",
        degree: edu.degree || "",
        field: edu.field || undefined,
        startDate: edu.startDate || undefined,
        endDate: edu.endDate || "",
        gpa: edu.gpa ? parseFloat(edu.gpa) : undefined,
        honors: edu.honors || undefined,
      })),
      skills: (parsedData.skills || []).map((skill) => ({
        id:
          skill.id ||
          `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: skill.name || "",
        category: skill.category || "Technical",
        proficiency: skill.proficiency || undefined,
      })),
      projects: (parsedData.projects || []).map((proj) => ({
        id:
          proj.id ||
          `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: proj.name || "",
        description: proj.description || "",
        technologies: Array.isArray(proj.technologies)
          ? proj.technologies
          : undefined,
        link: proj.link || undefined,
      })),
      certifications: (parsedData.certifications || []).map((cert) => ({
        id:
          cert.id ||
          `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: cert.name || "",
        organization: cert.organization || "",
        dateEarned: cert.dateEarned || "",
        expirationDate: cert.expirationDate || undefined,
      })),
    };

    return cleaned;
  }

  /**
   * Main method to parse a resume file
   */
  async parseResumeFile(filePath) {
    try {
      // Step 1: Extract text from file
      console.log("📄 Extracting text from resume file...");
      const resumeText = await this.extractTextFromFile(filePath);

      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error("No text could be extracted from the resume file");
      }

      console.log(`✓ Extracted ${resumeText.length} characters from resume`);

      // Step 2: Parse with AI
      console.log("🤖 Parsing resume with AI...");
      const parsedResume = await this.parseResumeWithAI(resumeText);

      console.log("✓ Resume parsed successfully");
      return parsedResume;
    } catch (error) {
      console.error("❌ Error parsing resume file:", error);
      throw error;
    }
  }
}

export default new ResumeParseService();
