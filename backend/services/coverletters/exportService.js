import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import coverLetterService from "./coreService.js";
import profileService from "../profileService.js";
import jobService from "../jobService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CoverLetterExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), "uploads", "exports", "coverletters");
    this.ensureExportDir();
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error("❌ Error creating export directory:", error);
    }
  }

  // Get cover letter content
  async getCoverLetterContent(coverLetterId, userId) {
    try {
      const coverLetter = await coverLetterService.getCoverLetterById(
        coverLetterId,
        userId
      );
      if (!coverLetter) {
        throw new Error("Cover letter not found");
      }

      // Get profile for personal info
      const profile = await profileService.getProfileByUserId(userId);
      const personalInfo = {
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        location:
          profile?.city && profile?.state
            ? `${profile.city}, ${profile.state}`
            : "",
      };

      // Get job details if jobId exists
      let jobDetails = null;
      if (coverLetter.jobId) {
        try {
          jobDetails = await jobService.getJobById(coverLetter.jobId, userId);
        } catch (error) {
          console.error("Error fetching job details:", error);
        }
      }

      return {
        coverLetter,
        personalInfo,
        jobDetails,
        content: coverLetter.content || {},
      };
    } catch (error) {
      console.error("❌ Error getting cover letter content:", error);
      throw error;
    }
  }

  // Export to PDF
  async exportToPDF(coverLetterId, userId, options = {}) {
    try {
      const { filename, includeLetterhead = false } = options;
      const data = await this.getCoverLetterContent(coverLetterId, userId);
      const { coverLetter, personalInfo, jobDetails, content } = data;

      // Create PDF document
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
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.pdf`;
      const filePath = path.join(this.exportDir, exportFilename);

      const stream = fsSync.createWriteStream(filePath);
      doc.pipe(stream);

      // Add letterhead if requested
      if (includeLetterhead) {
        doc.fontSize(10).text(personalInfo.location || "", { align: "right" });
        doc.moveDown(0.5);
        doc.text(new Date().toLocaleDateString(), { align: "right" });
        doc.moveDown(2);
      }

      // Add recipient information
      if (jobDetails) {
        doc.fontSize(10).text(jobDetails.company || "", { align: "left" });
        if (jobDetails.location) {
          doc.text(jobDetails.location, { align: "left" });
        }
        doc.moveDown(1);
      }

      // Add greeting
      const greeting = content.greeting || "Dear Hiring Manager,";
      doc.fontSize(11).text(greeting, { align: "left" });
      doc.moveDown(1);

      // Add opening paragraph
      if (content.opening) {
        doc.fontSize(11).text(content.opening, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(1);
      }

      // Add body paragraphs
      if (content.body && Array.isArray(content.body)) {
        content.body.forEach((paragraph) => {
          doc.fontSize(11).text(paragraph, {
            align: "left",
            lineGap: 5,
          });
          doc.moveDown(1);
        });
      } else if (content.fullText) {
        // Fallback to full text
        doc.fontSize(11).text(content.fullText, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(1);
      }

      // Add closing paragraph
      if (content.closing) {
        doc.fontSize(11).text(content.closing, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(2);
      }

      // Add signature
      doc.fontSize(11).text("Sincerely,", { align: "left" });
      doc.moveDown(1);
      doc.text(
        `${personalInfo.firstName} ${personalInfo.lastName}`.trim() ||
          "Your Name",
        { align: "left" }
      );

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      return {
        filePath,
        filename: exportFilename,
        mimeType: "application/pdf",
      };
    } catch (error) {
      console.error("❌ Error exporting cover letter to PDF:", error);
      throw error;
    }
  }

  // Export to DOCX
  async exportToDOCX(coverLetterId, userId, options = {}) {
    try {
      const { filename } = options;
      const data = await this.getCoverLetterContent(coverLetterId, userId);
      const { coverLetter, personalInfo, jobDetails, content } = data;

      const paragraphs = [];

      // Add date
      paragraphs.push(
        new Paragraph({
          text: new Date().toLocaleDateString(),
          alignment: AlignmentType.RIGHT,
        })
      );

      paragraphs.push(new Paragraph({ text: "" }));

      // Add recipient
      if (jobDetails) {
        paragraphs.push(new Paragraph({ text: jobDetails.company || "" }));
        if (jobDetails.location) {
          paragraphs.push(new Paragraph({ text: jobDetails.location }));
        }
        paragraphs.push(new Paragraph({ text: "" }));
      }

      // Add greeting
      const greeting = content.greeting || "Dear Hiring Manager,";
      paragraphs.push(new Paragraph({ text: greeting }));
      paragraphs.push(new Paragraph({ text: "" }));

      // Add opening
      if (content.opening) {
        paragraphs.push(new Paragraph({ text: content.opening }));
        paragraphs.push(new Paragraph({ text: "" }));
      }

      // Add body paragraphs
      if (content.body && Array.isArray(content.body)) {
        content.body.forEach((paragraph) => {
          paragraphs.push(new Paragraph({ text: paragraph }));
          paragraphs.push(new Paragraph({ text: "" }));
        });
      } else if (content.fullText) {
        paragraphs.push(new Paragraph({ text: content.fullText }));
        paragraphs.push(new Paragraph({ text: "" }));
      }

      // Add closing
      if (content.closing) {
        paragraphs.push(new Paragraph({ text: content.closing }));
        paragraphs.push(new Paragraph({ text: "" }));
      }

      // Add signature
      paragraphs.push(new Paragraph({ text: "Sincerely," }));
      paragraphs.push(new Paragraph({ text: "" }));
      paragraphs.push(
        new Paragraph({
          text:
            `${personalInfo.firstName} ${personalInfo.lastName}`.trim() ||
            "Your Name",
        })
      );

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
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.docx`;
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
      console.error("❌ Error exporting cover letter to DOCX:", error);
      throw error;
    }
  }

  // Export to TXT (plain text)
  async exportToTXT(coverLetterId, userId, options = {}) {
    try {
      const { filename } = options;
      const data = await this.getCoverLetterContent(coverLetterId, userId);
      const { coverLetter, personalInfo, jobDetails, content } = data;

      let text = "";

      // Add date
      text += new Date().toLocaleDateString() + "\n\n";

      // Add recipient
      if (jobDetails) {
        text += (jobDetails.company || "") + "\n";
        if (jobDetails.location) {
          text += jobDetails.location + "\n";
        }
        text += "\n";
      }

      // Add greeting
      const greeting = content.greeting || "Dear Hiring Manager,";
      text += greeting + "\n\n";

      // Add opening
      if (content.opening) {
        text += content.opening + "\n\n";
      }

      // Add body paragraphs
      if (content.body && Array.isArray(content.body)) {
        content.body.forEach((paragraph) => {
          text += paragraph + "\n\n";
        });
      } else if (content.fullText) {
        text += content.fullText + "\n\n";
      }

      // Add closing
      if (content.closing) {
        text += content.closing + "\n\n";
      }

      // Add signature
      text += "Sincerely,\n\n";
      text +=
        `${personalInfo.firstName} ${personalInfo.lastName}`.trim() ||
        "Your Name";

      // Write to file
      const fileId = uuidv4();
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.txt`;
      const filePath = path.join(this.exportDir, exportFilename);

      await fs.writeFile(filePath, text, "utf8");

      return {
        filePath,
        filename: exportFilename,
        mimeType: "text/plain",
      };
    } catch (error) {
      console.error("❌ Error exporting cover letter to TXT:", error);
      throw error;
    }
  }

  // Export to HTML
  async exportToHTML(coverLetterId, userId, options = {}) {
    try {
      const { filename } = options;
      const data = await this.getCoverLetterContent(coverLetterId, userId);
      const { coverLetter, personalInfo, jobDetails, content } = data;

      let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cover Letter - ${coverLetter.versionName || "Cover Letter"}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            line-height: 1.6;
        }
        .date {
            text-align: right;
            margin-bottom: 20px;
        }
        .recipient {
            margin-bottom: 20px;
        }
        .greeting {
            margin-bottom: 20px;
        }
        .body {
            margin-bottom: 20px;
        }
        .paragraph {
            margin-bottom: 15px;
        }
        .closing {
            margin-top: 30px;
            margin-bottom: 10px;
        }
        .signature {
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="date">${new Date().toLocaleDateString()}</div>`;

      if (jobDetails) {
        html += `
    <div class="recipient">
        <div>${jobDetails.company || ""}</div>
        ${jobDetails.location ? `<div>${jobDetails.location}</div>` : ""}
    </div>`;
      }

      const greeting = content.greeting || "Dear Hiring Manager,";
      html += `
    <div class="greeting">${greeting}</div>
    <div class="body">`;

      if (content.opening) {
        html += `\n        <div class="paragraph">${content.opening}</div>`;
      }

      if (content.body && Array.isArray(content.body)) {
        content.body.forEach((paragraph) => {
          html += `\n        <div class="paragraph">${paragraph}</div>`;
        });
      } else if (content.fullText) {
        html += `\n        <div class="paragraph">${content.fullText}</div>`;
      }

      if (content.closing) {
        html += `\n        <div class="paragraph">${content.closing}</div>`;
      }

      html += `
    </div>
    <div class="closing">Sincerely,</div>
    <div class="signature">${
      `${personalInfo.firstName} ${personalInfo.lastName}`.trim() ||
      "Your Name"
    }</div>
</body>
</html>`;

      // Write to file
      const fileId = uuidv4();
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.html`;
      const filePath = path.join(this.exportDir, exportFilename);

      await fs.writeFile(filePath, html, "utf8");

      return {
        filePath,
        filename: exportFilename,
        mimeType: "text/html",
      };
    } catch (error) {
      console.error("❌ Error exporting cover letter to HTML:", error);
      throw error;
    }
  }
}

export default new CoverLetterExportService();

