import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import fsSync from "fs";
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

      if (companyInfo) {
        [companyNews, companyMedia] = await Promise.all([
          companyResearchService.getCompanyNews(companyInfo.id, { limit: 20 }),
          companyResearchService.getCompanyMedia(companyInfo.id),
        ]);
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
      return {
        interview: {
          id: interview.id,
          company: interview.company,
          title: interview.title,
        },
        companyInfo: companyInfo || null,
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
        // Generate talking points and questions on-the-fly from available data
        talkingPoints: this.generateTalkingPointsSync(
          interview,
          companyInfo,
          interviewInsights
        ),
        questionsToAsk: this.generateQuestionsToAskSync(
          interview,
          companyInfo,
          interviewInsights
        ),
        competitiveLandscape: interviewInsights?.competitive_landscape || null,
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
      const filePath = path.join(this.exportDir, exportFilename);

      const stream = fsSync.createWriteStream(filePath);
      doc.pipe(stream);

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

      return new Promise((resolve, reject) => {
        stream.on("finish", () => {
          resolve({
            filePath,
            filename: exportFilename,
            mimeType: "application/pdf",
          });
        });
        stream.on("error", reject);
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

      // Export to file
      const fileId = uuidv4();
      const exportFilename = `company_research_${research.interview.company}_${fileId}.docx`;
      const filePath = path.join(this.exportDir, exportFilename);

      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filePath, buffer);

      return {
        filePath,
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
