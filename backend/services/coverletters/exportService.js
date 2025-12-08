import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
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

      // Get profile for personal info (handle case where profile doesn't exist)
      let personalInfo = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
      };
      
      try {
        const profile = await profileService.getProfileByUserId(userId);
        if (profile) {
          personalInfo = {
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            location:
              profile.city && profile.state
                ? `${profile.city}, ${profile.state}`
                : "",
          };
        }
      } catch (profileError) {
        console.warn("⚠️ Could not fetch profile for cover letter export:", profileError.message);
        // Use empty personalInfo - export will still work
      }

      // Get job details if jobId exists
      let jobDetails = null;
      if (coverLetter.jobId) {
        try {
          jobDetails = await jobService.getJobById(coverLetter.jobId, userId);
        } catch (error) {
          console.error("Error fetching job details:", error);
        }
      }

      // Parse content if it's a JSON string
      let content = coverLetter.content || {};
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          console.warn("⚠️ Failed to parse content JSON:", e);
          content = {};
        }
      }

      return {
        coverLetter,
        personalInfo,
        jobDetails,
        content,
      };
    } catch (error) {
      console.error("❌ Error getting cover letter content:", error);
      throw error;
    }
  }

  // Helper function to convert hex color to RGB
  hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
      console.warn("⚠️ Invalid hex color:", hex);
      return { r: 0, g: 0, b: 0 };
    }
    
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    
    // Handle 3-digit hex colors
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return { r, g, b };
    }
    
    // Handle 6-digit hex colors
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    
    console.warn("⚠️ Could not parse hex color:", hex);
    return { r: 0, g: 0, b: 0 };
  }

  // Helper function to map font names to PDFKit fonts
  getPDFFont(fontName, variant = '') {
    const fontMap = {
      Inter: 'Helvetica',
      Arial: 'Helvetica',
      'Times New Roman': 'Times-Roman',
      Georgia: 'Times-Roman',
      'Courier New': 'Courier',
      Helvetica: 'Helvetica',
      Calibri: 'Helvetica',
    };
    
    const baseFont = fontMap[fontName] || 'Helvetica';
    
    // PDFKit font variants
    if (variant === 'Bold') {
      return `${baseFont}-Bold`;
    } else if (variant === 'Oblique' || variant === 'Italic') {
      return `${baseFont}-Oblique`;
    }
    return baseFont;
  }

  // Export to PDF
  async exportToPDF(coverLetterId, userId, options = {}) {
    try {
      const { filename, includeLetterhead = false } = options;
      const data = await this.getCoverLetterContent(coverLetterId, userId);
      const { coverLetter, personalInfo, jobDetails, content } = data;

      // Get customizations from cover letter
      // Parse customizations if it's a JSON string
      let customizations = coverLetter?.customizations || {};
      if (typeof customizations === 'string') {
        try {
          customizations = JSON.parse(customizations);
        } catch (e) {
          console.warn("⚠️ Failed to parse customizations JSON:", e);
          customizations = {};
        }
      }

      // Parse colors if it's a JSON string
      let colors = customizations.colors || {
        primary: '#000000',
        secondary: '#000000',
        text: '#000000',
        background: '#FFFFFF',
        accent: '#F5F5F5',
      };
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (e) {
          console.warn("⚠️ Failed to parse colors JSON:", e);
          colors = {
            primary: '#000000',
            secondary: '#000000',
            text: '#000000',
            background: '#FFFFFF',
            accent: '#F5F5F5',
          };
        }
      }

      // Parse fonts if it's a JSON string
      let fonts = customizations.fonts || {
        heading: 'Arial',
        body: 'Arial',
        size: { heading: '14pt', body: '11pt' },
      };
      if (typeof fonts === 'string') {
        try {
          fonts = JSON.parse(fonts);
        } catch (e) {
          console.warn("⚠️ Failed to parse fonts JSON:", e);
          fonts = {
            heading: 'Arial',
            body: 'Arial',
            size: { heading: '14pt', body: '11pt' },
          };
        }
      }

      // Parse font sizes if they're strings (e.g., "11pt" -> 11)
      const bodyFontSize = fonts.size?.body 
        ? parseFloat(fonts.size.body.replace('pt', '')) || 11
        : 11;
      const headingFontSize = fonts.size?.heading
        ? parseFloat(fonts.size.heading.replace('pt', '')) || 14
        : 14;

      // Convert colors to RGB
      const textRgb = this.hexToRgb(colors.text);
      const backgroundRgb = this.hexToRgb(colors.background);
      const primaryRgb = this.hexToRgb(colors.primary);

      // Create PDF document with compact margins
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

      // Collect PDF chunks in memory instead of writing to disk
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      // Set background color if not white
      const isWhiteBackground = backgroundRgb.r === 255 && backgroundRgb.g === 255 && backgroundRgb.b === 255;
      if (!isWhiteBackground) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.save();
        doc.fillColor(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
        doc.rect(0, 0, pageWidth, pageHeight).fill();
        doc.restore();
      }

      // Set default fill color to text color
      doc.fillColor(textRgb.r, textRgb.g, textRgb.b);

      // Add letterhead if requested
      if (includeLetterhead) {
        doc.fontSize(10);
        doc.font(this.getPDFFont(fonts.body));
        doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(personalInfo.location || "", { align: "right" });
        doc.moveDown(0.5);
        doc.text(new Date().toLocaleDateString(), { align: "right" });
        doc.moveDown(2);
      }

      // Add date (right aligned)
      doc.fontSize(bodyFontSize);
      doc.font(this.getPDFFont(fonts.body));
      doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
      doc.text(new Date().toLocaleDateString(), { align: "right" });
      doc.moveDown(1.5);

      // Add recipient information
      if (jobDetails) {
        doc.fontSize(bodyFontSize);
        doc.font(this.getPDFFont(fonts.body));
        doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(jobDetails.company || "", { align: "left" });
        if (jobDetails.location) {
          doc.text(jobDetails.location, { align: "left" });
        }
        doc.moveDown(1.5);
      }

      // Add greeting
      const greeting = content.greeting || "Dear Hiring Manager,";
      doc.fontSize(bodyFontSize);
      doc.font(this.getPDFFont(fonts.body));
      doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
      doc.text(greeting, { align: "left" });
      doc.moveDown(1);

      // Add opening paragraph
      if (content.opening) {
        doc.fontSize(bodyFontSize);
        doc.font(this.getPDFFont(fonts.body));
        doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(content.opening, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(1);
      }

      // Add body paragraphs
      if (content.body && Array.isArray(content.body)) {
        content.body.forEach((paragraph) => {
          doc.fontSize(bodyFontSize);
          doc.font(this.getPDFFont(fonts.body));
          doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
          doc.text(paragraph, {
            align: "left",
            lineGap: 5,
          });
          doc.moveDown(1);
        });
      } else if (content.fullText) {
        // Fallback to full text
        doc.fontSize(bodyFontSize);
        doc.font(this.getPDFFont(fonts.body));
        doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(content.fullText, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(1);
      }

      // Add closing paragraph
      if (content.closing) {
        doc.fontSize(bodyFontSize);
        doc.font(this.getPDFFont(fonts.body));
        doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        doc.text(content.closing, {
          align: "left",
          lineGap: 5,
        });
        doc.moveDown(2);
      }

      // Add signature
      doc.fontSize(bodyFontSize);
      doc.font(this.getPDFFont(fonts.body));
      doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
      doc.text("Sincerely,", { align: "left" });
      doc.moveDown(1.5);
      doc.fontSize(bodyFontSize);
      doc.font(this.getPDFFont(fonts.body));
      doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
      doc.text(
        `${personalInfo.firstName} ${personalInfo.lastName}`.trim() ||
          "Your Name",
        { align: "left" }
      );

      // Finalize PDF and collect buffer
      doc.end();

      // Wait for PDF to finish generating
      const pdfBuffer = await new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });

      return {
        buffer: pdfBuffer,
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

      // Generate buffer directly
      const fileId = uuidv4();
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.docx`;

      const buffer = await Packer.toBuffer(doc);

      return {
        buffer: buffer,
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

      // Return text as buffer
      const fileId = uuidv4();
      const exportFilename =
        filename ||
        `cover_letter_${coverLetter.versionName || coverLetterId}_${fileId}.txt`;

      const textBuffer = Buffer.from(text, "utf8");

      return {
        buffer: textBuffer,
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

      // Return HTML as buffer
      const htmlBuffer = Buffer.from(html, "utf8");

      return {
        buffer: htmlBuffer,
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

