import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import resumeService from "./resumeService.js";
import profileService from "./profileService.js";
import jobService from "./jobService.js";
import skillService from "./skillService.js";
import educationService from "./educationService.js";
import projectService from "./projectService.js";
import certificationService from "./certificationService.js";

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

  // Get resume content from database and user profile
  async getResumeContent(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Get user profile data
      const profile = await profileService.getProfileByUserId(userId);
      const jobs = await jobService.getJobsByUserId(userId);
      const skills = await skillService.getSkillsByUserId(userId);
      const educations = await educationService.getEducationsByUserId(userId);
      const projects = await projectService.getProjectsByUserId(userId);
      const certifications = await certificationService.getCertifications(userId);

      // Build resume content structure
      const content = {
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

      // Generate HTML from resume content
      const html = this.generateHTML(content, resume, { watermark });

      // For now, return HTML (you'll need to add PDF generation library like puppeteer or pdfkit)
      // This is a placeholder - you'll need to implement actual PDF generation
      const exportPath = path.join(
        this.exportDir,
        filename || `resume_${resumeId}_${Date.now()}.html`
      );

      await fs.writeFile(exportPath, html, "utf-8");

      return {
        filePath: exportPath,
        fileName: path.basename(exportPath),
        format: "pdf",
        message: "PDF export generated (HTML placeholder - implement PDF generation)",
      };
    } catch (error) {
      console.error("❌ Error exporting to PDF:", error);
      throw error;
    }
  }

  // Export to DOCX
  async exportDOCX(resumeId, userId, options = {}) {
    try {
      const { filename } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      // Generate plain text from resume content
      const text = this.generatePlainText(content, resume);

      const exportPath = path.join(
        this.exportDir,
        filename || `resume_${resumeId}_${Date.now()}.txt`
      );

      await fs.writeFile(exportPath, text, "utf-8");

      return {
        filePath: exportPath,
        fileName: path.basename(exportPath),
        format: "docx",
        message: "DOCX export generated (TXT placeholder - implement DOCX generation)",
      };
    } catch (error) {
      console.error("❌ Error exporting to DOCX:", error);
      throw error;
    }
  }

  // Export to Plain Text
  async exportTXT(resumeId, userId, options = {}) {
    try {
      const { filename } = options;
      const { resume, content } = await this.getResumeContent(resumeId, userId);

      const text = this.generatePlainText(content, resume);

      const exportPath = path.join(
        this.exportDir,
        filename || `resume_${resumeId}_${Date.now()}.txt`
      );

      await fs.writeFile(exportPath, text, "utf-8");

      return {
        filePath: exportPath,
        fileName: path.basename(exportPath),
        format: "txt",
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

      const exportPath = path.join(
        this.exportDir,
        filename || `resume_${resumeId}_${Date.now()}.html`
      );

      await fs.writeFile(exportPath, html, "utf-8");

      return {
        filePath: exportPath,
        fileName: path.basename(exportPath),
        format: "html",
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

