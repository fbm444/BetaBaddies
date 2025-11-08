import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import resumeService from "./coreService.js";
import profileService from "../profileService.js";
import jobService from "../jobService.js";
import skillService from "../skillService.js";
import educationService from "../educationService.js";
import projectService from "../projectService.js";
import certificationService from "../certificationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ResumeExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), "uploads", "exports");
    this.ensureExportDir();
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error("❌ Error creating export directory:", error);
    }
  }

  // Get resume content from database (use resume.content if available, otherwise fallback to profile data)
  async getResumeContent(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Use resume.content if it exists and has data, otherwise fallback to profile data
      let content = resume.content;
      
      if (!content || !content.personalInfo || !content.personalInfo.firstName) {
        // Fallback to profile data if resume.content is empty
        const profile = await profileService.getProfileByUserId(userId);
        const jobs = await jobService.getJobsByUserId(userId);
        const skills = await skillService.getSkillsByUserId(userId);
        const educations = await educationService.getEducationsByUserId(userId);
        const projects = await projectService.getProjectsByUserId(userId);
        const certifications = await certificationService.getCertifications(userId);

        // Build resume content structure from profile
        content = {
          personalInfo: {
            firstName: profile?.first_name || "",
            lastName: profile?.last_name || "",
            email: profile?.email || "",
            phone: profile?.phone || "",
            location: profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : "",
            linkedIn: "",
            portfolio: "",
          },
          summary: profile?.bio || "",
          experience: (jobs || []).map((job) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location || "",
            startDate: job.start_date || job.startDate,
            endDate: job.end_date || job.endDate || null,
            isCurrent: job.is_current || job.isCurrent,
            description: job.description ? (typeof job.description === "string" ? job.description.split("\n") : []) : [],
          })),
          education: (educations || []).map((edu) => ({
            id: edu.id,
            school: edu.school,
            degree: `${edu.degree_type || edu.degreeType || ""}${edu.field ? ` in ${edu.field}` : ""}`,
            field: edu.field || "",
            startDate: edu.start_date || edu.startDate || null,
            endDate: edu.grad_date || edu.gradDate || null,
            gpa: edu.gpa || null,
            honors: edu.honors || null,
          })),
          skills: (skills || []).map((skill) => ({
            id: skill.id,
            name: skill.skill_name || skill.skillName,
            category: skill.category || "",
            proficiency: skill.proficiency || "",
          })),
          projects: (projects || []).map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description || "",
            technologies: project.technologies ? (typeof project.technologies === "string" ? project.technologies.split(",") : []) : [],
            link: project.link || "",
            startDate: project.start_date || project.startDate || null,
            endDate: project.end_date || project.endDate || null,
          })),
          certifications: (certifications || []).map((cert) => ({
            id: cert.id,
            name: cert.name,
            organization: cert.org_name || cert.orgName,
            dateEarned: cert.date_earned || cert.dateEarned,
            expirationDate: cert.expiration_date || cert.expirationDate || null,
          })),
        };
      }

      return { resume, content };
    } catch (error) {
      console.error("❌ Error getting resume content:", error);
      throw error;
    }
  }

  // Export to PDF
  async exportPDF(resumeId, userId, options = {}) {
    try {
      const { filename, watermark } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      // Debug: Log resume data
      console.log("📄 Export PDF - Resume object:", {
        hasResume: !!resume,
        hasCustomizations: !!resume?.customizations,
        customizations: resume?.customizations,
        hasContent: !!content,
      });

      const requestedFileName = filename || `resume_${resumeId}_${Date.now()}`;
      // Remove extension if present, we'll add .pdf
      const baseFileName = requestedFileName.replace(/\.(pdf|html)$/i, '');
      const fileName = `${baseFileName}.pdf`;
      const fileExtension = '.pdf';
      const fileId = uuidv4();
      const savedFileName = `export_${fileId}${fileExtension}`;
      const exportDir = path.join(process.cwd(), "uploads", "exports");
      
      // Ensure exports directory exists
      await fs.mkdir(exportDir, { recursive: true });
      
      // Generate PDF using PDFKit
      const filePath = path.join(exportDir, savedFileName);
      const pdfBuffer = await this.generatePDF(content, resume, { watermark });

      // Save PDF to disk
      await fs.writeFile(filePath, pdfBuffer);

      return {
        filePath: filePath,
        fileName: fileName,
        format: "pdf",
        contentType: "application/pdf",
        message: "PDF export generated successfully",
      };
    } catch (error) {
      console.error("❌ Error exporting to PDF:", error);
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

  // Generate PDF from resume content using PDFKit
  async generatePDF(content, resume, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const { watermark = false } = options;
        const chunks = [];
        
        // Validate content
        if (!content || !content.personalInfo) {
          reject(new Error("Invalid resume content: missing personalInfo"));
          return;
        }
        
        // Get customizations from resume
        const customizations = resume?.customizations || {};
        const colors = customizations.colors || {
          primary: '#3351FD',
          secondary: '#000000',
          text: '#000000',
          background: '#FFFFFF',
        };
        const fonts = customizations.fonts || {
          heading: 'Inter',
          body: 'Inter',
        };
        const spacing = customizations.spacing || {
          section: 24,
          item: 12,
        };
        
        // Debug logging - be careful with circular references
        try {
          console.log("📄 PDF Generation - Resume ID:", resume?.id);
          console.log("📄 PDF Generation - Has customizations:", !!resume?.customizations);
          console.log("📄 PDF Generation - Customizations type:", typeof resume?.customizations);
          if (resume?.customizations) {
            console.log("📄 PDF Generation - Customizations keys:", Object.keys(resume.customizations));
          }
        } catch (e) {
          console.error("❌ Error logging resume:", e);
        }
        
        console.log("📄 PDF Generation - Extracted values:", {
          colors: colors,
          fonts: fonts,
          spacing: spacing,
        });
        
        // Convert colors to RGB
        const primaryRgb = this.hexToRgb(colors.primary);
        const secondaryRgb = this.hexToRgb(colors.secondary);
        const textRgb = this.hexToRgb(colors.text);
        const backgroundRgb = this.hexToRgb(colors.background);
        
        console.log("📄 PDF Generation - RGB Colors:", {
          primary: primaryRgb,
          secondary: secondaryRgb,
          text: textRgb,
          background: backgroundRgb,
        });
        
        // Validate RGB values
        if (isNaN(primaryRgb.r) || isNaN(primaryRgb.g) || isNaN(primaryRgb.b)) {
          console.error("❌ Invalid primary color RGB:", primaryRgb);
        }
        
        // Create PDF document with compact margins for one-page resume
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 36,    // 0.5 inch = 36 points (reduced from 72)
            bottom: 36,
            left: 36,   // 0.5 inch (reduced from 54)
            right: 36
          }
        });

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
          console.error("❌ PDFKit error:", err);
          reject(err);
        });
        
        // Set background color - only draw if not white (PDFs default to white)
        const isWhiteBackground = backgroundRgb.r === 255 && backgroundRgb.g === 255 && backgroundRgb.b === 255;
        
        if (!isWhiteBackground) {
          // Draw background on each page as it's added
          const drawBackground = () => {
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            doc.save();
            doc.rect(0, 0, pageWidth, pageHeight)
               .fillColor(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b)
               .fill();
            doc.restore();
            // Always reset fill color to text color after drawing background
            doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
          };
          
          // Draw background on first page
          drawBackground();
          
          // Draw background on new pages
          doc.on('pageAdded', drawBackground);
        } else {
          // For white background, just set the default fill color
          doc.fillColor(textRgb.r, textRgb.g, textRgb.b);
        }

        // Add watermark if requested
        if (watermark) {
          doc.save();
          doc.rotate(45, { origin: [300, 400] });
          doc.opacity(0.1);
          doc.fontSize(72);
          doc.text('DRAFT', 0, 0);
          doc.restore();
        }

        // Header - Name
        const firstName = content.personalInfo?.firstName || '';
        const lastName = content.personalInfo?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Resume';
        
        // Header - Name (with primary color and heading font) - Compact size
        doc.fillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
           .fontSize(18)  // Reduced from 24
           .font(this.getPDFFont(fonts.heading, 'Bold'))
           .text(fullName, {
             align: 'center'
           })
           .moveDown(0.3);  // Reduced from 0.5

        // Contact Information
        const contactInfo = [];
        if (content.personalInfo?.email) contactInfo.push(content.personalInfo.email);
        if (content.personalInfo?.phone) contactInfo.push(content.personalInfo.phone);
        if (content.personalInfo?.location) contactInfo.push(content.personalInfo.location);
        if (content.personalInfo?.linkedIn) contactInfo.push(`LinkedIn: ${content.personalInfo.linkedIn}`);
        if (content.personalInfo?.portfolio) contactInfo.push(`Portfolio: ${content.personalInfo.portfolio}`);

        if (contactInfo.length > 0) {
          doc.fillColor(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
             .fontSize(8)  // Reduced from 10
             .font(this.getPDFFont(fonts.body))
             .text(contactInfo.join(' • '), {
               align: 'center'
             })
             .moveDown(0.4);  // Reduced from 1
        } else {
          // Add some spacing even if no contact info
          doc.moveDown(0.3);
        }
        
        // Draw border line under header (using primary color) - thinner line
        const currentY = doc.y;
        doc.strokeColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
           .lineWidth(1)  // Reduced from 2
           .moveTo(36, currentY)  // Use margin
           .lineTo(doc.page.width - 36, currentY)
           .stroke()
           .moveDown(8);  // Fixed compact spacing instead of spacing.section / 2

        // Summary
        if (content.summary) {
          // Get section formatting if available
          const summaryFormatting = customizations.sectionFormatting?.summary || {};
          const summaryColor = summaryFormatting.color 
            ? this.hexToRgb(summaryFormatting.color)
            : primaryRgb;
          
          doc.fillColor(summaryColor.r, summaryColor.g, summaryColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('SUMMARY', { underline: true })
             .moveDown(0.2);  // Reduced from 0.3
          
          doc.fillColor(textRgb.r, textRgb.g, textRgb.b)
             .fontSize(9)  // Reduced from 11
             .font(this.getPDFFont(fonts.body))
             .text(content.summary, {
               align: 'justify',
               lineGap: 2  // Compact line spacing
             })
             .moveDown(6);  // Fixed compact spacing
        }

        // Experience
        if (content.experience && content.experience.length > 0) {
          // Get section formatting if available
          const expFormatting = customizations.sectionFormatting?.experience || {};
          const expColor = expFormatting.color 
            ? this.hexToRgb(expFormatting.color)
            : primaryRgb;
          
          doc.fillColor(expColor.r, expColor.g, expColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('EXPERIENCE', { underline: true })
             .moveDown(0.3);  // Reduced from 0.5

          content.experience.forEach((exp) => {
            if (!exp) return; // Skip null/undefined entries
            
            const dateRange = `${exp.startDate || ''} - ${exp.isCurrent ? 'Present' : exp.endDate || ''}`;
            const title = exp.title || 'Position';
            const company = exp.company || 'Company';
            
            // Title and company - compact
            doc.fillColor(textRgb.r, textRgb.g, textRgb.b)
               .fontSize(10)  // Reduced from 12
               .font(this.getPDFFont(fonts.body, 'Bold'))
               .text(title, { continued: true })
               .font(this.getPDFFont(fonts.body))
               .text(` | ${company}`);
            
            // Date range on next line (right aligned)
            doc.fontSize(8)  // Reduced from 10
               .font(this.getPDFFont(fonts.body, 'Oblique'))
               .text(dateRange, {
                 align: 'right'
               })
               .moveDown(0.1);  // Reduced from 0.2

            if (exp.location) {
              doc.fontSize(8)
                 .font(this.getPDFFont(fonts.body, 'Oblique'))
                 .text(exp.location)
                 .moveDown(0.1);
            }

            if (exp.description && exp.description.length > 0) {
              exp.description.forEach((desc) => {
                doc.fontSize(8)  // Reduced from 10
                   .font(this.getPDFFont(fonts.body))
                   .text(`• ${desc}`, {
                     indent: 15,  // Reduced from 20
                     align: 'left',
                     lineGap: 1  // Compact line spacing
                   })
                   .moveDown(0.1);  // Reduced from 0.15
              });
            }
            
            doc.moveDown(4);  // Fixed compact spacing
          });
        }

        // Education
        if (content.education && content.education.length > 0) {
          // Get section formatting if available
          const eduFormatting = customizations.sectionFormatting?.education || {};
          const eduColor = eduFormatting.color 
            ? this.hexToRgb(eduFormatting.color)
            : primaryRgb;
          
          doc.fillColor(eduColor.r, eduColor.g, eduColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('EDUCATION', { underline: true })
             .moveDown(0.3);  // Reduced from 0.5

          content.education.forEach((edu) => {
            if (!edu) return; // Skip null/undefined entries
            
            const degree = edu.degree || 'Degree';
            const school = edu.school || 'School';
            
            doc.fontSize(10)  // Reduced from 12
               .font(this.getPDFFont(fonts.body, 'Bold'))
               .text(`${degree} - ${school}`);
            
            if (edu.endDate) {
              doc.fontSize(8)  // Reduced from 10
                 .font(this.getPDFFont(fonts.body, 'Oblique'))
                 .text(edu.endDate, {
                   align: 'right'
                 });
            }
            doc.moveDown(0.1);  // Reduced from 0.2

            if (edu.gpa) {
              doc.fontSize(8)
                 .font(this.getPDFFont(fonts.body))
                 .text(`GPA: ${edu.gpa}`)
                 .moveDown(0.1);
            }

            if (edu.honors) {
              doc.fontSize(8)
                 .font(this.getPDFFont(fonts.body))
                 .text(edu.honors)
                 .moveDown(0.1);
            }
            
            doc.moveDown(4);  // Fixed compact spacing
          });
        }

        // Skills
        if (content.skills && content.skills.length > 0) {
          // Get section formatting if available
          const skillsFormatting = customizations.sectionFormatting?.skills || {};
          const skillsColor = skillsFormatting.color 
            ? this.hexToRgb(skillsFormatting.color)
            : primaryRgb;
          
          doc.fillColor(skillsColor.r, skillsColor.g, skillsColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('SKILLS', { underline: true })
             .moveDown(0.2);  // Reduced from 0.3

          const skillNames = content.skills.map((s) => s.name).join(', ');
          doc.fillColor(textRgb.r, textRgb.g, textRgb.b)
             .fontSize(8)  // Reduced from 10
             .font(this.getPDFFont(fonts.body))
             .text(skillNames)
             .moveDown(6);  // Fixed compact spacing
        }

        // Projects
        if (content.projects && content.projects.length > 0) {
          // Get section formatting if available
          const projectsFormatting = customizations.sectionFormatting?.projects || {};
          const projectsColor = projectsFormatting.color 
            ? this.hexToRgb(projectsFormatting.color)
            : primaryRgb;
          
          doc.fillColor(projectsColor.r, projectsColor.g, projectsColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('PROJECTS', { underline: true })
             .moveDown(0.3);  // Reduced from 0.5

          content.projects.forEach((project) => {
            if (!project) return; // Skip null/undefined entries
            
            const projectName = project.name || 'Project';
            
            doc.fontSize(10)  // Reduced from 12
               .font(this.getPDFFont(fonts.body, 'Bold'))
               .text(projectName)
               .moveDown(0.1);  // Reduced from 0.2

            if (project.description) {
              doc.fontSize(8)  // Reduced from 10
                 .font(this.getPDFFont(fonts.body))
                 .text(project.description, {
                   align: 'justify',
                   lineGap: 1
                 })
                 .moveDown(0.1);
            }

            if (project.technologies && project.technologies.length > 0) {
              doc.fontSize(8)
                 .font(this.getPDFFont(fonts.body, 'Oblique'))
                 .text(`Technologies: ${project.technologies.join(', ')}`)
                 .moveDown(0.1);
            }

            if (project.link) {
              doc.fontSize(8)
                 .font(this.getPDFFont(fonts.body))
                 .fillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
                 .text(project.link, {
                   link: project.link,
                   underline: true
                 })
                 .fillColor(textRgb.r, textRgb.g, textRgb.b)
                 .moveDown(0.1);
            }
            
            doc.moveDown(4);  // Fixed compact spacing
          });
        }

        // Certifications
        if (content.certifications && content.certifications.length > 0) {
          // Get section formatting if available
          const certsFormatting = customizations.sectionFormatting?.certifications || {};
          const certsColor = certsFormatting.color 
            ? this.hexToRgb(certsFormatting.color)
            : primaryRgb;
          
          doc.fillColor(certsColor.r, certsColor.g, certsColor.b)
             .fontSize(11)  // Reduced from 14
             .font(this.getPDFFont(fonts.heading, 'Bold'))
             .text('CERTIFICATIONS', { underline: true })
             .moveDown(0.3);  // Reduced from 0.5

          content.certifications.forEach((cert) => {
            if (!cert) return; // Skip null/undefined entries
            
            const certName = cert.name || 'Certification';
            const org = cert.organization || 'Organization';
            const date = cert.dateEarned || '';
            
            doc.fillColor(textRgb.r, textRgb.g, textRgb.b)
               .fontSize(8)  // Reduced from 10
               .font(this.getPDFFont(fonts.body))
               .text(`${certName} - ${org}${date ? ` (${date})` : ''}`)
               .moveDown(0.2);  // Reduced from 0.3
          });
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Export to DOCX
  async exportDOCX(resumeId, userId, options = {}) {
    try {
      const { filename } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      // Debug: Log resume data
      console.log("📄 Export DOCX - Resume object:", {
        hasResume: !!resume,
        hasCustomizations: !!resume?.customizations,
        customizations: resume?.customizations,
        hasContent: !!content,
      });

      const requestedFileName = filename || `resume_${resumeId}_${Date.now()}`;
      // Remove extension if present, we'll add .docx
      const baseFileName = requestedFileName.replace(/\.(docx|txt)$/i, '');
      const fileName = `${baseFileName}.docx`;
      const fileExtension = '.docx';
      const fileId = uuidv4();
      const savedFileName = `export_${fileId}${fileExtension}`;
      const exportDir = path.join(process.cwd(), "uploads", "exports");
      
      // Ensure exports directory exists
      await fs.mkdir(exportDir, { recursive: true });
      
      // Generate DOCX using docx library
      const filePath = path.join(exportDir, savedFileName);
      const docxBuffer = await this.generateDOCX(content, resume, options);

      // Save DOCX to disk
      await fs.writeFile(filePath, docxBuffer);

      return {
        filePath: filePath,
        fileName: fileName,
        format: "docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        message: "DOCX export generated successfully",
      };
    } catch (error) {
      console.error("❌ Error exporting to DOCX:", error);
      throw error;
    }
  }

  // Generate DOCX from resume content using docx library
  async generateDOCX(content, resume, options = {}) {
    try {
      // Get customizations from resume
      const customizations = resume?.customizations || {};
      const colors = customizations.colors || {
        primary: '#3351FD',
        secondary: '#000000',
        text: '#000000',
        background: '#FFFFFF',
      };
      const fonts = customizations.fonts || {
        heading: 'Inter',
        body: 'Inter',
      };
      const spacing = customizations.spacing || {
        section: 24,
        item: 12,
      };

      // Helper to convert hex to RGB for docx (expects hex string without #)
      const hexToDocxColor = (hex) => {
        const rgb = this.hexToRgb(hex);
        // docx expects hex color without #, e.g., "3351FD"
        return hex.replace('#', '').toUpperCase();
      };

      // Helper to convert hex to RGB for docx shading (expects hex string)
      const hexToDocxShading = (hex) => {
        const rgb = this.hexToRgb(hex);
        // docx shading expects hex with #, e.g., "#FFFFFF"
        return hex.toUpperCase();
      };

      const primaryColor = hexToDocxColor(colors.primary);
      const secondaryColor = hexToDocxColor(colors.secondary);
      const textColor = hexToDocxColor(colors.text);
      const backgroundColor = hexToDocxShading(colors.background);

      const children = [];

      // Header - Name
      const firstName = content.personalInfo?.firstName || '';
      const lastName = content.personalInfo?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Resume';

      children.push(
        new Paragraph({
          text: fullName,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },  // Reduced from 200
          children: [
            new TextRun({
              text: fullName,
              bold: true,
              size: 36, // 18pt = 36 half-points (reduced from 48)
              color: primaryColor,
              font: fonts.heading,
            }),
          ],
        })
      );

      // Contact Information
      const contactInfo = [];
      if (content.personalInfo?.email) contactInfo.push(content.personalInfo.email);
      if (content.personalInfo?.phone) contactInfo.push(content.personalInfo.phone);
      if (content.personalInfo?.location) contactInfo.push(content.personalInfo.location);
      if (content.personalInfo?.linkedIn) contactInfo.push(`LinkedIn: ${content.personalInfo.linkedIn}`);
      if (content.personalInfo?.portfolio) contactInfo.push(`Portfolio: ${content.personalInfo.portfolio}`);

      if (contactInfo.length > 0) {
        children.push(
          new Paragraph({
            text: contactInfo.join(' • '),
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },  // Reduced from 400
            children: [
              new TextRun({
                text: contactInfo.join(' • '),
                size: 16, // 8pt = 16 half-points (reduced from 20)
                color: secondaryColor,
                font: fonts.body,
              }),
            ],
          })
        );
      }

      // Summary
      if (content.summary) {
        const summaryFormatting = customizations.sectionFormatting?.summary || {};
        const summaryColor = summaryFormatting.color 
          ? hexToDocxColor(summaryFormatting.color)
          : primaryColor;

        children.push(
          new Paragraph({
            text: 'SUMMARY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 100 },  // Compact spacing
            children: [
              new TextRun({
                text: 'SUMMARY',
                bold: true,
                size: 22, // 11pt = 22 half-points (reduced from 28)
                color: summaryColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          }),
          new Paragraph({
            text: content.summary,
            spacing: { after: 120 },  // Compact spacing
            children: [
              new TextRun({
                text: content.summary,
                size: 18, // 9pt = 18 half-points (reduced from 22)
                color: textColor,
                font: fonts.body,
              }),
            ],
          })
        );
      }

      // Experience
      if (content.experience && content.experience.length > 0) {
        const expFormatting = customizations.sectionFormatting?.experience || {};
        const expColor = expFormatting.color 
          ? hexToDocxColor(expFormatting.color)
          : primaryColor;

        children.push(
          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 200 },  // Compact spacing
            children: [
              new TextRun({
                text: 'EXPERIENCE',
                bold: true,
                size: 22,  // Reduced from 28
                color: expColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          })
        );

        content.experience.forEach((exp) => {
          if (!exp) return;

          const dateRange = `${exp.startDate || ''} - ${exp.isCurrent ? 'Present' : exp.endDate || ''}`;
          const title = exp.title || 'Position';
          const company = exp.company || 'Company';

          children.push(
            new Paragraph({
              spacing: { after: 80 },  // Reduced from 200
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 20, // 10pt (reduced from 24)
                  color: textColor,
                  font: fonts.body,
                }),
                new TextRun({
                  text: ` | ${company}`,
                  size: 20,
                  color: textColor,
                  font: fonts.body,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 80 },  // Reduced from 200
              children: [
                new TextRun({
                  text: dateRange,
                  italics: true,
                  size: 16,  // Reduced from 20
                  color: textColor,
                  font: fonts.body,
                }),
              ],
            })
          );

          if (exp.location) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: exp.location,
                    italics: true,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          if (exp.description && exp.description.length > 0) {
            exp.description.forEach((desc) => {
              children.push(
                new Paragraph({
                  indent: { left: 300 },  // Reduced from 400
                  spacing: { after: 60 },  // Reduced from 120
                  children: [
                    new TextRun({
                      text: `• ${desc}`,
                      size: 16,  // Reduced from 20
                      color: textColor,
                      font: fonts.body,
                    }),
                  ],
                })
              );
            });
          }

          children.push(
            new Paragraph({
              spacing: { after: 80 },  // Compact spacing
            })
          );
        });
      }

      // Education
      if (content.education && content.education.length > 0) {
        const eduFormatting = customizations.sectionFormatting?.education || {};
        const eduColor = eduFormatting.color 
          ? hexToDocxColor(eduFormatting.color)
          : primaryColor;

        children.push(
          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 200 },  // Compact spacing
            children: [
              new TextRun({
                text: 'EDUCATION',
                bold: true,
                size: 22,  // Reduced from 28
                color: eduColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          })
        );

        content.education.forEach((edu) => {
          if (!edu) return;

          const degree = edu.degree || 'Degree';
          const school = edu.school || 'School';

          children.push(
            new Paragraph({
              spacing: { after: 60 },  // Reduced from 200
              children: [
                new TextRun({
                  text: `${degree} - ${school}`,
                  bold: true,
                  size: 20,  // Reduced from 24
                  color: textColor,
                  font: fonts.body,
                }),
              ],
            })
          );

          if (edu.endDate) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: edu.endDate,
                    italics: true,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          if (edu.gpa) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: `GPA: ${edu.gpa}`,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          if (edu.honors) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: edu.honors,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          children.push(
            new Paragraph({
              spacing: { after: 80 },  // Compact spacing
            })
          );
        });
      }

      // Skills
      if (content.skills && content.skills.length > 0) {
        const skillsFormatting = customizations.sectionFormatting?.skills || {};
        const skillsColor = skillsFormatting.color 
          ? hexToDocxColor(skillsFormatting.color)
          : primaryColor;

        const skillNames = content.skills.map((s) => s.name).join(', ');

        children.push(
          new Paragraph({
            text: 'SKILLS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 120 },  // Compact spacing
            children: [
              new TextRun({
                text: 'SKILLS',
                bold: true,
                size: 22,  // Reduced from 28
                color: skillsColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          }),
          new Paragraph({
            text: skillNames,
            spacing: { after: 120 },  // Compact spacing
            children: [
              new TextRun({
                text: skillNames,
                size: 16,  // Reduced from 20
                color: textColor,
                font: fonts.body,
              }),
            ],
          })
        );
      }

      // Projects
      if (content.projects && content.projects.length > 0) {
        const projectsFormatting = customizations.sectionFormatting?.projects || {};
        const projectsColor = projectsFormatting.color 
          ? hexToDocxColor(projectsFormatting.color)
          : primaryColor;

        children.push(
          new Paragraph({
            text: 'PROJECTS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 200 },  // Compact spacing
            children: [
              new TextRun({
                text: 'PROJECTS',
                bold: true,
                size: 22,  // Reduced from 28
                color: projectsColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          })
        );

        content.projects.forEach((project) => {
          if (!project) return;

          const projectName = project.name || 'Project';

          children.push(
            new Paragraph({
              spacing: { after: 60 },  // Reduced from 200
              children: [
                new TextRun({
                  text: projectName,
                  bold: true,
                  size: 20,  // Reduced from 24
                  color: textColor,
                  font: fonts.body,
                }),
              ],
            })
          );

          if (project.description) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: project.description,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          if (project.technologies && project.technologies.length > 0) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: `Technologies: ${project.technologies.join(', ')}`,
                    italics: true,
                    size: 16,  // Reduced from 20
                    color: textColor,
                    font: fonts.body,
                  }),
                ],
              })
            );
          }

          if (project.link) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },  // Reduced from 200
                children: [
                  new TextRun({
                    text: project.link,
                    size: 16,  // Reduced from 20
                    color: primaryColor,
                    font: fonts.body,
                    underline: {},
                  }),
                ],
              })
            );
          }

          children.push(
            new Paragraph({
              spacing: { after: 80 },  // Compact spacing
            })
          );
        });
      }

      // Certifications
      if (content.certifications && content.certifications.length > 0) {
        const certsFormatting = customizations.sectionFormatting?.certifications || {};
        const certsColor = certsFormatting.color 
          ? hexToDocxColor(certsFormatting.color)
          : primaryColor;

        children.push(
          new Paragraph({
            text: 'CERTIFICATIONS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 200 },  // Compact spacing
            children: [
              new TextRun({
                text: 'CERTIFICATIONS',
                bold: true,
                size: 22,  // Reduced from 28
                color: certsColor,
                font: fonts.heading,
                underline: {},
              }),
            ],
          })
        );

        content.certifications.forEach((cert) => {
          if (!cert) return;

          const certName = cert.name || 'Certification';
          const org = cert.organization || 'Organization';
          const date = cert.dateEarned || '';

          children.push(
            new Paragraph({
              spacing: { after: 120 },  // Reduced from 240
              children: [
                new TextRun({
                  text: `${certName} - ${org}${date ? ` (${date})` : ''}`,
                  size: 16,  // Reduced from 20
                  color: textColor,
                  font: fonts.body,
                }),
              ],
            })
          );
        });
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation: 'portrait',
                  width: 11906, // A4 width in twips (8.27 inches * 1440)
                  height: 16838, // A4 height in twips (11.69 inches * 1440)
                },
                margin: {
                  top: 1440, // 1 inch = 1440 twips
                  right: 1080, // 0.75 inch
                  bottom: 1440,
                  left: 1080,
                },
              },
            },
            children: children,
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error("❌ Error generating DOCX:", error);
      throw error;
    }
  }

  // Export to Plain Text
  async exportTXT(resumeId, userId, options = {}) {
    try {
      const { filename } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      const text = this.generatePlainText(content, resume);

      const fileName = filename || `resume_${resumeId}_${Date.now()}.txt`;
      const fileExtension = '.txt';
      const fileId = uuidv4();
      const savedFileName = `export_${fileId}${fileExtension}`;
      const exportDir = path.join(process.cwd(), "uploads", "exports");
      
      // Ensure exports directory exists
      await fs.mkdir(exportDir, { recursive: true });
      
      // Save file to disk
      const filePath = path.join(exportDir, savedFileName);
      await fs.writeFile(filePath, text, 'utf8');

      return {
        filePath: filePath,
        fileName: fileName,
        format: "txt",
        contentType: "text/plain",
        message: "Plain text export generated",
      };
    } catch (error) {
      console.error("❌ Error exporting to TXT:", error);
      throw error;
    }
  }

  // Export to HTML
  async exportHTML(resumeId, userId, options = {}) {
    try {
      const { filename, watermark } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      const html = this.generateHTML(content, resume, { watermark });

      const fileName = filename || `resume_${resumeId}_${Date.now()}.html`;
      const fileExtension = '.html';
      const fileId = uuidv4();
      const savedFileName = `export_${fileId}${fileExtension}`;
      const exportDir = path.join(process.cwd(), "uploads", "exports");
      
      // Ensure exports directory exists
      await fs.mkdir(exportDir, { recursive: true });
      
      // Save file to disk
      const filePath = path.join(exportDir, savedFileName);
      await fs.writeFile(filePath, html, 'utf8');

      return {
        filePath: filePath,
        fileName: fileName,
        format: "html",
        contentType: "text/html",
        message: "HTML export generated",
      };
    } catch (error) {
      console.error("❌ Error exporting to HTML:", error);
      throw error;
    }
  }

  // Generate HTML from resume content
  generateHTML(content, resume, options = {}) {
    const { watermark = false } = options;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${resume.versionName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { margin: 0; font-size: 28px; }
        .contact { margin-top: 10px; color: #666; }
        .section { margin-bottom: 30px; }
        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; font-size: 20px; }
        .experience-item, .education-item { margin-bottom: 20px; }
        .job-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .company { font-weight: bold; }
        .date { color: #666; }
        .skills { display: flex; flex-wrap: wrap; gap: 10px; }
        .skill { background: #f0f0f0; padding: 5px 10px; border-radius: 3px; }
        ul { margin: 5px 0; padding-left: 20px; }
        ${watermark ? '.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(0,0,0,0.1); z-index: -1; }' : ''}
        @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
    </style>
</head>
<body>
    ${watermark ? '<div class="watermark">DRAFT</div>' : ''}
    <div class="header">
        <h1>${content.personalInfo.firstName} ${content.personalInfo.lastName}</h1>
        <div class="contact">
            ${content.personalInfo.email ? `<span>${content.personalInfo.email}</span>` : ""}
            ${content.personalInfo.phone ? `<span> • ${content.personalInfo.phone}</span>` : ""}
            ${content.personalInfo.location ? `<span> • ${content.personalInfo.location}</span>` : ""}
        </div>
    </div>`;

    if (content.summary) {
      html += `
    <div class="section">
        <h2>Summary</h2>
        <p>${content.summary}</p>
    </div>`;
    }

    if (content.experience && content.experience.length > 0) {
      html += `
    <div class="section">
        <h2>Experience</h2>`;
      content.experience.forEach((exp) => {
        html += `
        <div class="experience-item">
            <div class="job-header">
                <div>
                    <span class="company">${exp.title}</span> - ${exp.company}
                </div>
                <div class="date">${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""}</div>
            </div>
            ${exp.location ? `<div style="color: #666; margin-bottom: 5px;">${exp.location}</div>` : ""}
            ${exp.description && exp.description.length > 0 ? `<ul>${exp.description.map((desc) => `<li>${desc}</li>`).join("")}</ul>` : ""}
        </div>`;
      });
      html += `
    </div>`;
    }

    if (content.education && content.education.length > 0) {
      html += `
    <div class="section">
        <h2>Education</h2>`;
      content.education.forEach((edu) => {
        html += `
        <div class="education-item">
            <div class="job-header">
                <div><strong>${edu.degree}</strong> - ${edu.school}</div>
                <div class="date">${edu.endDate || ""}</div>
            </div>
            ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ""}
            ${edu.honors ? `<div>${edu.honors}</div>` : ""}
        </div>`;
      });
      html += `
    </div>`;
    }

    if (content.skills && content.skills.length > 0) {
      html += `
    <div class="section">
        <h2>Skills</h2>
        <div class="skills">`;
      content.skills.forEach((skill) => {
        html += `<span class="skill">${skill.name}</span>`;
      });
      html += `
        </div>
    </div>`;
    }

    if (content.projects && content.projects.length > 0) {
      html += `
    <div class="section">
        <h2>Projects</h2>`;
      content.projects.forEach((project) => {
        html += `
        <div class="experience-item">
            <div class="job-header">
                <div><strong>${project.name}</strong></div>
                ${project.link ? `<div><a href="${project.link}">View Project</a></div>` : ""}
            </div>
            <p>${project.description}</p>
            ${project.technologies && project.technologies.length > 0 ? `<div>Technologies: ${project.technologies.join(", ")}</div>` : ""}
        </div>`;
      });
      html += `
    </div>`;
    }

    if (content.certifications && content.certifications.length > 0) {
      html += `
    <div class="section">
        <h2>Certifications</h2>
        <ul>`;
      content.certifications.forEach((cert) => {
        html += `<li><strong>${cert.name}</strong> - ${cert.organization} (${cert.dateEarned})</li>`;
      });
      html += `
        </ul>
    </div>`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  // Generate plain text from resume content
  generatePlainText(content, resume) {
    let text = `${content.personalInfo.firstName} ${content.personalInfo.lastName}\n`;
    text += `${"=".repeat(50)}\n\n`;

    if (content.personalInfo.email) text += `Email: ${content.personalInfo.email}\n`;
    if (content.personalInfo.phone) text += `Phone: ${content.personalInfo.phone}\n`;
    if (content.personalInfo.location) text += `Location: ${content.personalInfo.location}\n`;
    text += "\n";

    if (content.summary) {
      text += `SUMMARY\n${"-".repeat(50)}\n${content.summary}\n\n`;
    }

    if (content.experience && content.experience.length > 0) {
      text += `EXPERIENCE\n${"-".repeat(50)}\n`;
      content.experience.forEach((exp) => {
        text += `${exp.title} - ${exp.company}\n`;
        text += `${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""}\n`;
        if (exp.location) text += `${exp.location}\n`;
        if (exp.description && exp.description.length > 0) {
          exp.description.forEach((desc) => {
            text += `  • ${desc}\n`;
          });
        }
        text += "\n";
      });
    }

    if (content.education && content.education.length > 0) {
      text += `EDUCATION\n${"-".repeat(50)}\n`;
      content.education.forEach((edu) => {
        text += `${edu.degree} - ${edu.school}\n`;
        if (edu.endDate) text += `Graduated: ${edu.endDate}\n`;
        if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
        if (edu.honors) text += `${edu.honors}\n`;
        text += "\n";
      });
    }

    if (content.skills && content.skills.length > 0) {
      text += `SKILLS\n${"-".repeat(50)}\n`;
      const skillNames = content.skills.map((s) => s.name).join(", ");
      text += `${skillNames}\n\n`;
    }

    if (content.projects && content.projects.length > 0) {
      text += `PROJECTS\n${"-".repeat(50)}\n`;
      content.projects.forEach((project) => {
        text += `${project.name}\n`;
        if (project.link) text += `${project.link}\n`;
        text += `${project.description}\n`;
        if (project.technologies && project.technologies.length > 0) {
          text += `Technologies: ${project.technologies.join(", ")}\n`;
        }
        text += "\n";
      });
    }

    if (content.certifications && content.certifications.length > 0) {
      text += `CERTIFICATIONS\n${"-".repeat(50)}\n`;
      content.certifications.forEach((cert) => {
        text += `${cert.name} - ${cert.organization} (${cert.dateEarned})\n`;
      });
    }

    return text;
  }
}

export default new ResumeExportService();

