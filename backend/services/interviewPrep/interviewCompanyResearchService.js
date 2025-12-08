import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from "docx";
import OpenAI from "openai";
import database from "../database.js";
import companyResearchService from "../companyResearchService.js";
import companyInterviewInsightsService from "../companyInterviewInsightsService.js";
import companyResearchAutomationService from "../companyResearchAutomationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service for managing company research automation for interviews (UC-074)
 * Leverages existing company research infrastructure
 */
class InterviewCompanyResearchService {
  constructor() {
    this.exportDir = path.join(
      process.cwd(),
      "uploads",
      "exports",
      "company-research"
    );
    this.ensureExportDir();
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL;
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey,
        ...(this.openaiApiUrl && { baseURL: this.openaiApiUrl }),
      });
    }
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error creating export directory:",
        error
      );
    }
  }
  /**
   * Get comprehensive company research for an interview
   * Combines data from company_info, company_news, company_media, and company_interview_insights
   */
  async getCompanyResearchForInterview(interviewId, userId) {
    try {
      // Verify interview belongs to user
      const interviewQuery = `
        SELECT id, job_opportunity_id, company, title
        FROM interviews
        WHERE id = $1 AND user_id = $2
      `;
      const interviewResult = await database.query(interviewQuery, [
        interviewId,
        userId,
      ]);

      if (interviewResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const interview = interviewResult.rows[0];

      if (!interview.job_opportunity_id) {
        return {
          interview,
          companyInfo: null,
          companyNews: [],
          companyMedia: [],
          interviewInsights: null,
          researchData: null,
        };
      }

      // Get company research from job_opportunity
      const companyInfo = await companyResearchService.getCompanyInfoByJobId(
        interview.job_opportunity_id
      );

      let companyNews = [];
      let companyMedia = [];
      let enrichedCompanyData = null;

      if (companyInfo) {
        [companyNews, companyMedia] = await Promise.all([
          companyResearchService.getCompanyNews(companyInfo.id, { limit: 20 }),
          companyResearchService.getCompanyMedia(companyInfo.id),
        ]);

        // Generate enriched data on-the-fly if not already stored
        // Check if enriched fields exist in companyInfo first
        if (companyInfo.mission || companyInfo.culture || companyInfo.values) {
          // Use existing enriched data from database
          enrichedCompanyData = {
            mission: companyInfo.mission,
            culture: companyInfo.culture,
            values: companyInfo.values,
            recentDevelopments: companyInfo.recentDevelopments,
            products: companyInfo.products,
            competitors: companyInfo.competitors,
            whyWorkHere: companyInfo.whyWorkHere,
            interviewTips: companyInfo.interviewTips,
            foundedYear: companyInfo.foundedYear,
          };
        } else {
          // Generate enriched data using AI on-the-fly
          try {
            // Get job details for AI enrichment
            const jobQuery = await database.query(
              "SELECT company, title, job_description FROM job_opportunities WHERE id = $1",
              [interview.job_opportunity_id]
            );

            if (jobQuery.rows.length > 0) {
              const job = jobQuery.rows[0];
              const aiEnrichment =
                await companyResearchAutomationService.enrichWithAI(
                  interview.company || job.company,
                  null, // abstractData - not needed for on-the-fly generation
                  companyNews.slice(0, 5), // Use existing news
                  job
                );

              if (aiEnrichment) {
                enrichedCompanyData = {
                  mission: aiEnrichment.mission,
                  culture: aiEnrichment.culture,
                  values: null, // AI doesn't generate this separately
                  recentDevelopments: aiEnrichment.recentDevelopments,
                  products: aiEnrichment.products,
                  competitors: aiEnrichment.competitors,
                  whyWorkHere: aiEnrichment.whyWorkHere,
                  interviewTips: aiEnrichment.interviewTips,
                  foundedYear: companyInfo.foundedYear,
                };
              }
            }
          } catch (error) {
            console.warn(
              "[InterviewCompanyResearchService] Failed to generate enriched company data:",
              error.message
            );
          }
        }
      }

      // Get interview insights (contains common_questions, interviewer_profiles, etc.)
      let interviewInsights = null;
      try {
        const insights =
          await companyInterviewInsightsService.getInsightsForJob(
            interview.job_opportunity_id,
            userId,
            { roleTitle: interview.title }
          );
        interviewInsights = insights.insights;
      } catch (error) {
        console.warn(
          "[InterviewCompanyResearchService] Failed to get interview insights:",
          error.message
        );
      }

      // Compile comprehensive research report using existing tables
      // All data comes from company_info, company_news, company_media, and company_interview_insights
      // Merge enriched data (mission, culture, values) with basic company info
      const mergedCompanyInfo = companyInfo
        ? {
            ...companyInfo,
            // Add enriched fields if available
            mission:
              enrichedCompanyData?.mission || companyInfo.mission || null,
            culture:
              enrichedCompanyData?.culture || companyInfo.culture || null,
            values: enrichedCompanyData?.values || companyInfo.values || null,
            recentDevelopments:
              enrichedCompanyData?.recentDevelopments ||
              companyInfo.recentDevelopments ||
              null,
            products:
              enrichedCompanyData?.products || companyInfo.products || null,
            competitors:
              enrichedCompanyData?.competitors ||
              companyInfo.competitors ||
              null,
            whyWorkHere:
              enrichedCompanyData?.whyWorkHere ||
              companyInfo.whyWorkHere ||
              null,
            interviewTips:
              enrichedCompanyData?.interviewTips ||
              companyInfo.interviewTips ||
              null,
            foundedYear:
              enrichedCompanyData?.foundedYear ||
              companyInfo.foundedYear ||
              null,
          }
        : null;

      return {
        interview: {
          id: interview.id,
          company: interview.company,
          title: interview.title,
        },
        companyInfo: mergedCompanyInfo,
        companyNews: companyNews.map((news) => ({
          heading: news.heading,
          description: news.description,
          type: news.type,
          date: news.date,
          source: news.source,
        })),
        companyMedia: companyMedia.map((media) => ({
          platform: media.platform,
          link: media.link,
        })),
        interviewInsights: interviewInsights
          ? {
              processOverview: interviewInsights.process_overview || "",
              stages: interviewInsights.stages || [],
              timelineExpectations:
                interviewInsights.timeline_expectations || "",
              interviewFormats: interviewInsights.interview_formats || [],
              commonQuestions: interviewInsights.common_questions || [],
              interviewerProfiles: interviewInsights.interviewer_profiles || [],
              preparationRecommendations:
                interviewInsights.preparation_recommendations || [],
              successTips: interviewInsights.success_tips || [],
              checklist: interviewInsights.checklist || [],
              additionalResources: interviewInsights.additional_resources || [],
            }
          : null,
        // AI-generated content - return null initially, will be generated separately
        competitiveLandscape: null,
        talkingPoints: null,
        questionsToAsk: null,
        aiContentLoading: true,
      };
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error getting company research:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate AI content (competitive landscape, talking points, questions) for an interview
   * Called separately to avoid blocking the initial data load
   */
  async generateAIContent(interviewId, userId) {
    try {
      // Verify interview belongs to user
      const interviewQuery = `
        SELECT id, job_opportunity_id, company, title
        FROM interviews
        WHERE id = $1 AND user_id = $2
      `;
      const interviewResult = await database.query(interviewQuery, [
        interviewId,
        userId,
      ]);

      if (interviewResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const interview = interviewResult.rows[0];

      if (!interview.job_opportunity_id) {
        throw new Error(
          "Interview must be linked to a job opportunity to generate AI content"
        );
      }

      // Get company research data (non-AI)
      const companyInfo = await companyResearchService.getCompanyInfoByJobId(
        interview.job_opportunity_id
      );

      let companyNews = [];
      let interviewInsights = null;

      if (companyInfo) {
        companyNews = await companyResearchService.getCompanyNews(
          companyInfo.id,
          { limit: 20 }
        );
      }

      // Get interview insights
      try {
        const insights =
          await companyInterviewInsightsService.getInsightsForJob(
            interview.job_opportunity_id,
            userId,
            { roleTitle: interview.title }
          );
        interviewInsights = insights.insights;
      } catch (error) {
        console.warn(
          "[InterviewCompanyResearchService] Failed to get interview insights:",
          error.message
        );
      }

      // Merge company info
      const mergedCompanyInfo = companyInfo
        ? {
            ...companyInfo,
            mission: companyInfo.mission || null,
            culture: companyInfo.culture || null,
            values: companyInfo.values || null,
            recentDevelopments: companyInfo.recentDevelopments || null,
            products: companyInfo.products || null,
            competitors: companyInfo.competitors || null,
            whyWorkHere: companyInfo.whyWorkHere || null,
            interviewTips: companyInfo.interviewTips || null,
            foundedYear: companyInfo.foundedYear || null,
          }
        : null;

      // Generate AI content in parallel
      const [competitiveLandscape, talkingPoints, questionsToAsk] =
        await Promise.all([
          this.generateCompetitiveLandscape(
            interview,
            mergedCompanyInfo,
            companyNews,
            interviewInsights
          ),
          this.generateTalkingPointsWithAI(
            interview,
            mergedCompanyInfo,
            companyNews,
            interviewInsights
          ),
          this.generateQuestionsToAskWithAI(
            interview,
            mergedCompanyInfo,
            companyNews,
            interviewInsights
          ),
        ]);

      return {
        competitiveLandscape,
        talkingPoints,
        questionsToAsk,
      };
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error generating AI content:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate/refresh company research for an interview
   * Automatically triggered when interview is created or manually requested
   */
  async generateCompanyResearch(interviewId, userId, options = {}) {
    try {
      const { forceRefresh = false } = options;

      // Verify interview belongs to user
      const interviewQuery = `
        SELECT id, job_opportunity_id, company, title
        FROM interviews
        WHERE id = $1 AND user_id = $2
      `;
      const interviewResult = await database.query(interviewQuery, [
        interviewId,
        userId,
      ]);

      if (interviewResult.rows.length === 0) {
        throw new Error("Interview not found");
      }

      const interview = interviewResult.rows[0];

      if (!interview.job_opportunity_id) {
        throw new Error(
          "Interview must be linked to a job opportunity to generate research"
        );
      }

      // Get or generate company research via automation service
      let companyResearch = null;
      try {
        companyResearch =
          await companyResearchAutomationService.researchCompany(
            interview.job_opportunity_id,
            userId
          );
      } catch (error) {
        console.warn(
          "[InterviewCompanyResearchService] Company research automation failed:",
          error.message
        );
      }

      // Get or generate interview insights
      let interviewInsights = null;
      try {
        const insights =
          await companyInterviewInsightsService.getInsightsForJob(
            interview.job_opportunity_id,
            userId,
            {
              roleTitle: interview.title,
              forceRefresh,
            }
          );
        interviewInsights = insights.insights;
      } catch (error) {
        console.warn(
          "[InterviewCompanyResearchService] Failed to generate interview insights:",
          error.message
        );
      }

      // Generate talking points and questions to ask using AI
      const talkingPoints = await this.generateTalkingPoints(
        interview,
        companyResearch,
        interviewInsights
      );
      const questionsToAsk = await this.generateQuestionsToAsk(
        interview,
        companyResearch,
        interviewInsights
      );

      // All data is stored in existing tables (company_info, company_news, company_media, company_interview_insights)
      // No need to store in interviews table - data is retrieved from existing tables when needed
      return {
        success: true,
        talkingPoints,
        questionsToAsk,
        companyResearch,
        interviewInsights,
      };
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error generating company research:",
        error
      );
      throw error;
    }
  }

  /**
   * Generate talking points synchronously (for retrieval)
   */
  generateTalkingPointsSync(interview, companyInfo, interviewInsights) {
    const points = [];

    if (companyInfo?.description) {
      points.push(
        `I'm impressed by ${interview.company}'s focus on innovation`
      );
    }

    if (interviewInsights?.preparation_recommendations) {
      const recommendations = Array.isArray(
        interviewInsights.preparation_recommendations
      )
        ? interviewInsights.preparation_recommendations
        : [interviewInsights.preparation_recommendations];
      points.push(...recommendations.slice(0, 3));
    }

    if (interviewInsights?.successTips) {
      const tips = Array.isArray(interviewInsights.successTips)
        ? interviewInsights.successTips
        : [interviewInsights.successTips];
      points.push(...tips.slice(0, 3));
    }

    return points.length > 0
      ? points
      : ["Research the company's recent news and initiatives"];
  }

  /**
   * Generate questions to ask synchronously (for retrieval)
   */
  generateQuestionsToAskSync(interview, companyInfo, interviewInsights) {
    const questions = [];

    // Add standard questions
    questions.push(
      "What does success look like in this role in the first 90 days?",
      "What are the biggest challenges facing this team right now?",
      "How does this role contribute to the company's goals?"
    );

    // Add company-specific questions if we have recent developments
    if (companyInfo?.description) {
      questions.push(
        "I'm interested in learning more about the company's future direction. What excites you most about where the company is heading?"
      );
    }

    return questions.length > 0
      ? questions
      : [
          "What does a typical day look like in this role?",
          "What are the opportunities for growth and development?",
          "What do you enjoy most about working here?",
        ];
  }

  /**
   * Generate talking points for the interview (async version for generation)
   */
  async generateTalkingPoints(interview, companyResearch, interviewInsights) {
    // For now, return basic talking points
    // Could be enhanced with AI generation
    const points = [];

    if (companyResearch?.companyInfo) {
      if (companyResearch.companyInfo.mission) {
        points.push(
          `Company mission: ${companyResearch.companyInfo.mission.substring(
            0,
            100
          )}...`
        );
      }
      if (companyResearch.companyInfo.recentDevelopments) {
        points.push(
          `Recent developments: ${companyResearch.companyInfo.recentDevelopments.substring(
            0,
            100
          )}...`
        );
      }
    }

    if (interviewInsights?.successTips) {
      points.push(...interviewInsights.successTips.slice(0, 3));
    }

    return points.length > 0
      ? points
      : ["Research the company's recent news and initiatives"];
  }

  /**
   * Generate questions to ask the interviewer
   */
  async generateQuestionsToAsk(interview, companyResearch, interviewInsights) {
    const questions = [];

    // Add questions from interview insights if available
    if (interviewInsights?.commonQuestions) {
      // Transform common questions into questions to ask
      questions.push(
        "What does success look like in this role in the first 90 days?",
        "What are the biggest challenges facing this team right now?",
        "How does this role contribute to the company's goals?"
      );
    }

    // Add company-specific questions
    if (companyResearch?.companyInfo?.recentDevelopments) {
      questions.push(
        "I noticed [recent development]. How does this impact the team I'd be joining?"
      );
    }

    return questions.length > 0
      ? questions
      : [
          "What does a typical day look like in this role?",
          "What are the opportunities for growth and development?",
          "What do you enjoy most about working here?",
        ];
  }

  /**
   * Generate competitive landscape and market position using AI
   */
  async generateCompetitiveLandscape(
    interview,
    companyInfo,
    companyNews,
    interviewInsights
  ) {
    // If we already have competitors data, use it
    if (
      companyInfo?.competitors &&
      Array.isArray(companyInfo.competitors) &&
      companyInfo.competitors.length > 0
    ) {
      return {
        marketPosition:
          companyInfo.description || "Market leader in their industry",
        competitors: companyInfo.competitors,
      };
    }

    // Try to get from interview insights
    if (interviewInsights?.competitive_landscape) {
      return interviewInsights.competitive_landscape;
    }

    // Generate using AI if available
    if (!this.openai) {
      return {
        marketPosition:
          "Research the company's market position and competitive landscape",
        competitors: [],
      };
    }

    try {
      const newsSummary = companyNews
        .slice(0, 5)
        .map((n) => n.heading)
        .join(", ");

      const prompt = `Analyze the competitive landscape and market position for ${
        interview.company
      } (Role: ${interview.title}).

Company Information:
${companyInfo?.description || "No description available"}
${companyInfo?.industry ? `Industry: ${companyInfo.industry}` : ""}
${
  companyInfo?.products
    ? `Products: ${
        Array.isArray(companyInfo.products)
          ? companyInfo.products.join(", ")
          : companyInfo.products
      }`
    : ""
}

Recent News:
${newsSummary || "No recent news available"}

Provide a JSON response with:
{
  "marketPosition": "Detailed analysis of the company's position in the market, their strengths, and market share",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3", "Competitor 4", "Competitor 5"]
}

Focus on:
- Market position and competitive advantages
- Key competitors in the same space
- Industry trends affecting the company
- Strategic positioning`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content:
              "You are a business analyst providing competitive landscape analysis for interview preparation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[InterviewCompanyResearchService] Failed to generate competitive landscape:",
        error.message
      );
      return {
        marketPosition:
          "Research the company's market position and competitive landscape",
        competitors: [],
      };
    }
  }

  /**
   * Generate intelligent talking points using AI
   */
  async generateTalkingPointsWithAI(
    interview,
    companyInfo,
    companyNews,
    interviewInsights
  ) {
    if (!this.openai) {
      return this.generateTalkingPointsSync(
        interview,
        companyInfo,
        interviewInsights
      );
    }

    try {
      const newsSummary = companyNews
        .slice(0, 5)
        .map((n) => `${n.heading}: ${n.description || ""}`)
        .join("\n");

      const prompt = `Generate intelligent talking points for a candidate interviewing for ${
        interview.title
      } at ${interview.company}.

Company Information:
${companyInfo?.description || "No description available"}
${companyInfo?.mission ? `Mission: ${companyInfo.mission}` : ""}
${
  companyInfo?.values
    ? `Values: ${
        Array.isArray(companyInfo.values)
          ? companyInfo.values.join(", ")
          : companyInfo.values
      }`
    : ""
}
${companyInfo?.culture ? `Culture: ${companyInfo.culture}` : ""}
${
  companyInfo?.recentDevelopments
    ? `Recent Developments: ${companyInfo.recentDevelopments}`
    : ""
}

Recent News:
${newsSummary || "No recent news available"}

Generate 5-8 intelligent talking points that:
1. Demonstrate knowledge of the company
2. Show genuine interest and research
3. Connect the candidate's background to company values/mission
4. Reference recent news or developments
5. Are natural conversation starters
6. Highlight why the candidate is interested in this specific company

Respond with ONLY a JSON array of strings:
["Talking point 1", "Talking point 2", "Talking point 3", ...]`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content:
              "You are an interview coach helping candidates prepare intelligent talking points.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[InterviewCompanyResearchService] Failed to generate talking points with AI:",
        error.message
      );
      return this.generateTalkingPointsSync(
        interview,
        companyInfo,
        interviewInsights
      );
    }
  }

  /**
   * Generate intelligent questions to ask using AI
   */
  async generateQuestionsToAskWithAI(
    interview,
    companyInfo,
    companyNews,
    interviewInsights
  ) {
    if (!this.openai) {
      return this.generateQuestionsToAskSync(
        interview,
        companyInfo,
        interviewInsights
      );
    }

    try {
      const newsSummary = companyNews
        .slice(0, 5)
        .map((n) => `${n.heading}: ${n.description || ""}`)
        .join("\n");

      const fundingNews = companyNews.filter(
        (n) =>
          n.heading?.toLowerCase().includes("funding") ||
          n.heading?.toLowerCase().includes("raised") ||
          n.heading?.toLowerCase().includes("investment")
      );

      const strategicNews = companyNews.filter(
        (n) =>
          n.heading?.toLowerCase().includes("partnership") ||
          n.heading?.toLowerCase().includes("acquisition") ||
          n.heading?.toLowerCase().includes("expansion")
      );

      const prompt = `Generate intelligent questions for a candidate to ask during an interview for ${
        interview.title
      } at ${interview.company}.

Company Information:
${companyInfo?.description || "No description available"}
${companyInfo?.mission ? `Mission: ${companyInfo.mission}` : ""}
${
  companyInfo?.recentDevelopments
    ? `Recent Developments: ${companyInfo.recentDevelopments}`
    : ""
}

Recent News:
${newsSummary || "No recent news available"}
${
  fundingNews.length > 0
    ? `\nFunding News: ${fundingNews.map((n) => n.heading).join(", ")}`
    : ""
}
${
  strategicNews.length > 0
    ? `\nStrategic Initiatives: ${strategicNews
        .map((n) => n.heading)
        .join(", ")}`
    : ""
}

Generate 5-8 intelligent questions that:
1. Demonstrate research and genuine interest
2. Reference specific company news, funding, or strategic initiatives
3. Show understanding of the role and company direction
4. Are thoughtful and not generic
5. Help the candidate evaluate if the role/company is a good fit
6. Can lead to meaningful conversation

Respond with ONLY a JSON array of strings:
["Question 1", "Question 2", "Question 3", ...]`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content:
              "You are an interview coach helping candidates prepare intelligent questions to ask interviewers.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse JSON from OpenAI response");
    } catch (error) {
      console.warn(
        "[InterviewCompanyResearchService] Failed to generate questions with AI:",
        error.message
      );
      return this.generateQuestionsToAskSync(
        interview,
        companyInfo,
        interviewInsights
      );
    }
  }

  /**
   * Export company research report
   */
  async exportResearchReport(interviewId, userId, format = "markdown") {
    try {
      const research = await this.getCompanyResearchForInterview(
        interviewId,
        userId
      );

      if (format === "markdown") {
        const markdown = this.formatAsMarkdown(research);
        return { report: markdown, format: "markdown" };
      } else if (format === "json") {
        const json = JSON.stringify(research, null, 2);
        return { report: json, format: "json" };
      } else if (format === "pdf") {
        return await this.exportToPDF(interviewId, userId, research);
      } else if (format === "docx") {
        return await this.exportToDOCX(interviewId, userId, research);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error exporting research:",
        error
      );
      throw error;
    }
  }

  /**
   * Export to PDF
   */
  async exportToPDF(interviewId, userId, research) {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72,
        },
      });

      const fileId = uuidv4();
      const exportFilename = `company_research_${research.interview.company}_${fileId}.pdf`;

      // Collect PDF chunks in memory instead of writing to disk
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      // Title
      doc.fontSize(24).font("Helvetica-Bold");
      doc.text("Company Research Report", { align: "center" });
      doc.moveDown(1);

      // Company and Position
      doc.fontSize(14).font("Helvetica");
      doc.text(`Company: ${research.interview.company}`, { align: "left" });
      doc.text(`Position: ${research.interview.title}`, { align: "left" });
      doc.moveDown(2);

      // Company Overview
      if (research.companyInfo) {
        doc.fontSize(18).font("Helvetica-Bold");
        doc.text("Company Overview");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");

        if (research.companyInfo.description) {
          doc.text(research.companyInfo.description, {
            align: "left",
            width: 468,
          });
          doc.moveDown(1);
        }

        if (research.companyInfo.mission) {
          doc.fontSize(12).font("Helvetica-Bold");
          doc.text("Mission & Values");
          doc.fontSize(11).font("Helvetica");
          doc.text(research.companyInfo.mission, {
            align: "left",
            width: 468,
          });
          doc.moveDown(1);
        }
      }

      // Recent News
      if (research.companyNews && research.companyNews.length > 0) {
        doc.addPage();
        doc.fontSize(18).font("Helvetica-Bold");
        doc.text("Recent News & Strategic Initiatives");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");

        research.companyNews.slice(0, 10).forEach((news) => {
          doc.fontSize(12).font("Helvetica-Bold");
          doc.text(news.heading || "News Item");
          doc.fontSize(11).font("Helvetica");
          if (news.description) {
            doc.text(news.description, {
              align: "left",
              width: 468,
            });
          }
          if (news.date) {
            doc.fontSize(10).font("Helvetica-Oblique");
            doc.text(`Date: ${new Date(news.date).toLocaleDateString()}`);
          }
          doc.moveDown(1);
        });
      }

      // Interview Insights
      if (research.interviewInsights) {
        doc.addPage();
        doc.fontSize(18).font("Helvetica-Bold");
        doc.text("Interview Process Insights");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");

        if (research.interviewInsights.processOverview) {
          doc.fontSize(12).font("Helvetica-Bold");
          doc.text("Process Overview");
          doc.fontSize(11).font("Helvetica");
          doc.text(research.interviewInsights.processOverview, {
            align: "left",
            width: 468,
          });
          doc.moveDown(1);
        }

        if (
          research.interviewInsights.commonQuestions &&
          research.interviewInsights.commonQuestions.length > 0
        ) {
          doc.fontSize(12).font("Helvetica-Bold");
          doc.text("Common Interview Questions");
          doc.fontSize(11).font("Helvetica");
          research.interviewInsights.commonQuestions
            .slice(0, 10)
            .forEach((q) => {
              const question = typeof q === "string" ? q : q.question || q;
              doc.text(`• ${question}`, {
                align: "left",
                width: 468,
              });
              doc.moveDown(0.5);
            });
        }
      }

      // Talking Points
      if (research.talkingPoints && research.talkingPoints.length > 0) {
        doc.addPage();
        doc.fontSize(18).font("Helvetica-Bold");
        doc.text("Talking Points");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");

        research.talkingPoints.forEach((point) => {
          doc.text(`• ${point}`, {
            align: "left",
            width: 468,
          });
          doc.moveDown(0.5);
        });
      }

      // Questions to Ask
      if (research.questionsToAsk && research.questionsToAsk.length > 0) {
        doc.addPage();
        doc.fontSize(18).font("Helvetica-Bold");
        doc.text("Questions to Ask");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");

        research.questionsToAsk.forEach((question, idx) => {
          doc.text(`${idx + 1}. ${question}`, {
            align: "left",
            width: 468,
          });
          doc.moveDown(0.5);
        });
      }

      doc.end();

      // Wait for PDF to finish generating and return buffer
      return new Promise((resolve, reject) => {
        doc.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            filename: exportFilename,
            mimeType: "application/pdf",
          });
        });
        doc.on("error", reject);
      });
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error exporting to PDF:",
        error
      );
      throw error;
    }
  }

  /**
   * Export to DOCX
   */
  async exportToDOCX(interviewId, userId, research) {
    try {
      const paragraphs = [];

      // Title
      paragraphs.push(
        new Paragraph({
          text: "Company Research Report",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
      paragraphs.push(new Paragraph({ text: "" }));

      // Company and Position
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Company: ", bold: true }),
            new TextRun({ text: research.interview.company }),
          ],
        })
      );
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Position: ", bold: true }),
            new TextRun({ text: research.interview.title }),
          ],
        })
      );
      paragraphs.push(new Paragraph({ text: "" }));

      // Company Overview
      if (research.companyInfo) {
        paragraphs.push(
          new Paragraph({
            text: "Company Overview",
            heading: HeadingLevel.HEADING_2,
          })
        );

        if (research.companyInfo.description) {
          paragraphs.push(
            new Paragraph({ text: research.companyInfo.description })
          );
          paragraphs.push(new Paragraph({ text: "" }));
        }

        if (research.companyInfo.mission) {
          paragraphs.push(
            new Paragraph({
              text: "Mission & Values",
              heading: HeadingLevel.HEADING_3,
            })
          );
          paragraphs.push(
            new Paragraph({ text: research.companyInfo.mission })
          );
          paragraphs.push(new Paragraph({ text: "" }));
        }
      }

      // Recent News
      if (research.companyNews && research.companyNews.length > 0) {
        paragraphs.push(
          new Paragraph({
            text: "Recent News & Strategic Initiatives",
            heading: HeadingLevel.HEADING_2,
          })
        );

        research.companyNews.slice(0, 10).forEach((news) => {
          paragraphs.push(
            new Paragraph({
              text: news.heading || "News Item",
              heading: HeadingLevel.HEADING_3,
            })
          );
          if (news.description) {
            paragraphs.push(new Paragraph({ text: news.description }));
          }
          if (news.date) {
            paragraphs.push(
              new Paragraph({
                text: `Date: ${new Date(news.date).toLocaleDateString()}`,
                italics: true,
              })
            );
          }
          paragraphs.push(new Paragraph({ text: "" }));
        });
      }

      // Interview Insights
      if (research.interviewInsights) {
        paragraphs.push(
          new Paragraph({
            text: "Interview Process Insights",
            heading: HeadingLevel.HEADING_2,
          })
        );

        if (research.interviewInsights.processOverview) {
          paragraphs.push(
            new Paragraph({
              text: "Process Overview",
              heading: HeadingLevel.HEADING_3,
            })
          );
          paragraphs.push(
            new Paragraph({ text: research.interviewInsights.processOverview })
          );
          paragraphs.push(new Paragraph({ text: "" }));
        }

        if (
          research.interviewInsights.commonQuestions &&
          research.interviewInsights.commonQuestions.length > 0
        ) {
          paragraphs.push(
            new Paragraph({
              text: "Common Interview Questions",
              heading: HeadingLevel.HEADING_3,
            })
          );
          research.interviewInsights.commonQuestions
            .slice(0, 10)
            .forEach((q) => {
              const question = typeof q === "string" ? q : q.question || q;
              paragraphs.push(
                new Paragraph({
                  text: `• ${question}`,
                })
              );
            });
          paragraphs.push(new Paragraph({ text: "" }));
        }
      }

      // Talking Points
      if (research.talkingPoints && research.talkingPoints.length > 0) {
        paragraphs.push(
          new Paragraph({
            text: "Talking Points",
            heading: HeadingLevel.HEADING_2,
          })
        );

        research.talkingPoints.forEach((point) => {
          paragraphs.push(
            new Paragraph({
              text: `• ${point}`,
            })
          );
        });
        paragraphs.push(new Paragraph({ text: "" }));
      }

      // Questions to Ask
      if (research.questionsToAsk && research.questionsToAsk.length > 0) {
        paragraphs.push(
          new Paragraph({
            text: "Questions to Ask",
            heading: HeadingLevel.HEADING_2,
          })
        );

        research.questionsToAsk.forEach((question, idx) => {
          paragraphs.push(
            new Paragraph({
              text: `${idx + 1}. ${question}`,
            })
          );
        });
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      // Generate buffer directly
      const fileId = uuidv4();
      const exportFilename = `company_research_${research.interview.company}_${fileId}.docx`;

      const buffer = await Packer.toBuffer(doc);

      return {
        buffer: buffer,
        filename: exportFilename,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    } catch (error) {
      console.error(
        "[InterviewCompanyResearchService] Error exporting to DOCX:",
        error
      );
      throw error;
    }
  }

  /**
   * Format research as markdown
   */
  formatAsMarkdown(research) {
    let markdown = `# Company Research Report\n\n`;
    markdown += `**Company:** ${research.interview.company}\n`;
    markdown += `**Position:** ${research.interview.title}\n\n`;

    if (research.companyInfo) {
      markdown += `## Company Overview\n\n`;
      if (research.companyInfo.description) {
        markdown += `${research.companyInfo.description}\n\n`;
      }
      if (research.companyInfo.mission) {
        markdown += `### Mission & Values\n${research.companyInfo.mission}\n\n`;
      }
    }

    if (research.companyNews && research.companyNews.length > 0) {
      markdown += `## Recent News\n\n`;
      research.companyNews.slice(0, 5).forEach((news) => {
        markdown += `### ${news.heading}\n`;
        if (news.description) {
          markdown += `${news.description}\n\n`;
        }
      });
    }

    if (research.interviewInsights) {
      markdown += `## Interview Insights\n\n`;
      if (research.interviewInsights.processOverview) {
        markdown += `### Process Overview\n${research.interviewInsights.processOverview}\n\n`;
      }
      if (research.interviewInsights.commonQuestions.length > 0) {
        markdown += `### Common Questions\n\n`;
        research.interviewInsights.commonQuestions.slice(0, 10).forEach((q) => {
          markdown += `- ${q.question}\n`;
        });
        markdown += `\n`;
      }
    }

    if (research.talkingPoints && research.talkingPoints.length > 0) {
      markdown += `## Talking Points\n\n`;
      research.talkingPoints.forEach((point) => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n`;
    }

    if (research.questionsToAsk && research.questionsToAsk.length > 0) {
      markdown += `## Questions to Ask\n\n`;
      research.questionsToAsk.forEach((question) => {
        markdown += `- ${question}\n`;
      });
    }

    return markdown;
  }
}

export default new InterviewCompanyResearchService();
