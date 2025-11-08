import { v4 as uuidv4 } from "uuid";
import database from "../database.js";

class ResumeTemplateService {
  constructor() {
    this.maxTemplateNameLength = 255;
    this.maxFilePathLength = 1000;
  }

  // Create a new resume template
  async createTemplate(templateData) {
    const { templateName, description, colors, fonts, existingResumeTemplate } =
      templateData;

    try {
      // Validate template name if provided
      if (templateName && templateName.length > this.maxTemplateNameLength) {
        throw new Error(
          `Template name must be less than ${this.maxTemplateNameLength} characters`
        );
      }

      const templateId = uuidv4();

      const query = `
        INSERT INTO resume_template (id, template_name, description, colors, fonts, existing_resume_template)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, template_name, description, colors, fonts, existing_resume_template
      `;

      const result = await database.query(query, [
        templateId,
        templateName || null,
        description || null,
        colors || null,
        fonts || null,
        existingResumeTemplate || null,
      ]);

      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      console.error("❌ Error creating template:", error);
      throw error;
    }
  }

  // Get all templates (includes default templates)
  async getTemplates(options = {}) {
    try {
      const { templateName, includeDefaults = true } = options;

      let dbTemplates = [];

      // Try to get templates from database (might fail if table doesn't exist)
      try {
        let query = `
          SELECT id, template_name, description, colors, fonts, existing_resume_template
          FROM resume_template
        `;

        const params = [];
        if (templateName) {
          query += ` WHERE template_name = $1`;
          params.push(templateName);
        }

        query += ` ORDER BY template_name ASC`;

        const result = await database.query(query, params);
        dbTemplates = result.rows.map(this.mapRowToTemplate);
      } catch (dbError) {
        // If table doesn't exist or query fails, just use empty array
        console.log(
          "⚠️ Could not fetch templates from database (table may not exist):",
          dbError.message
        );
        dbTemplates = [];
      }

      // Add default templates if requested
      if (includeDefaults) {
        const defaultTemplates = this.getDefaultTemplates();
        // Map default templates to ensure consistent format
        const mappedDefaults = defaultTemplates.map((t) =>
          this.mapRowToTemplate(t)
        );
        return [...mappedDefaults, ...dbTemplates];
      }

      return dbTemplates;
    } catch (error) {
      console.error("❌ Error getting templates:", error);
      throw error;
    }
  }

  // Get default/pre-built templates
  getDefaultTemplates() {
    return [
      {
        id: "default-chronological",
        templateName: "Modern Chronological",
        templateType: "chronological",
        description:
          "Traditional format highlighting work history in reverse chronological order. Best for candidates with steady career progression.",
        colors: JSON.stringify({
          primary: "#3351FD",
          secondary: "#000000",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F5F5F5",
        }),
        fonts: JSON.stringify({
          heading: "Inter",
          body: "Inter",
          size: { heading: "24px", body: "12px" },
        }),
        sectionOrder: JSON.stringify([
          "personal",
          "summary",
          "experience",
          "education",
          "skills",
          "projects",
          "certifications",
        ]),
        isDefault: true,
        isShared: true,
        layoutConfig: JSON.stringify({
          spacing: { section: 24, item: 12 },
          alignment: "left",
          headerStyle: "centered",
        }),
        existingResumeTemplate: null,
      },
      {
        id: "default-functional",
        templateName: "Functional Focus",
        templateType: "functional",
        description:
          "Skills-focused format emphasizing abilities over work history. Ideal for career changers or those with employment gaps.",
        colors: JSON.stringify({
          primary: "#000000",
          secondary: "#3351FD",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F0F0F0",
        }),
        fonts: JSON.stringify({
          heading: "Roboto",
          body: "Roboto",
          size: { heading: "22px", body: "11px" },
        }),
        sectionOrder: JSON.stringify([
          "personal",
          "summary",
          "skills",
          "experience",
          "education",
          "projects",
        ]),
        isDefault: true,
        isShared: true,
        layoutConfig: JSON.stringify({
          spacing: { section: 20, item: 10 },
          alignment: "left",
          headerStyle: "left-aligned",
        }),
        existingResumeTemplate: null,
      },
      {
        id: "default-hybrid",
        templateName: "Hybrid Professional",
        templateType: "hybrid",
        description:
          "Combines chronological and functional elements. Highlights both skills and work history. Great for experienced professionals.",
        colors: JSON.stringify({
          primary: "#000000",
          secondary: "#666666",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#E8E8E8",
        }),
        fonts: JSON.stringify({
          heading: "Georgia",
          body: "Georgia",
          size: { heading: "26px", body: "13px" },
        }),
        sectionOrder: JSON.stringify([
          "personal",
          "summary",
          "experience",
          "skills",
          "education",
          "projects",
          "certifications",
        ]),
        isDefault: true,
        isShared: true,
        layoutConfig: JSON.stringify({
          spacing: { section: 28, item: 14 },
          alignment: "justified",
          headerStyle: "centered",
        }),
        existingResumeTemplate: null,
      },
      {
        id: "default-minimal",
        templateName: "Minimal Clean",
        templateType: "chronological",
        description:
          "Clean, minimalist design with plenty of white space. Perfect for creative professionals and tech roles.",
        colors: JSON.stringify({
          primary: "#000000",
          secondary: "#333333",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#FAFAFA",
        }),
        fonts: JSON.stringify({
          heading: "Helvetica",
          body: "Helvetica",
          size: { heading: "20px", body: "11px" },
        }),
        sectionOrder: JSON.stringify([
          "personal",
          "summary",
          "experience",
          "education",
          "skills",
        ]),
        isDefault: true,
        isShared: true,
        layoutConfig: JSON.stringify({
          spacing: { section: 30, item: 15 },
          alignment: "left",
          headerStyle: "centered",
        }),
        existingResumeTemplate: null,
      },
      {
        id: "default-executive",
        templateName: "Executive Classic",
        templateType: "chronological",
        description:
          "Professional, traditional format for senior-level positions. Emphasizes leadership and achievements.",
        colors: JSON.stringify({
          primary: "#1A1A1A",
          secondary: "#4A4A4A",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F8F8F8",
        }),
        fonts: JSON.stringify({
          heading: "Times New Roman",
          body: "Times New Roman",
          size: { heading: "28px", body: "12px" },
        }),
        sectionOrder: JSON.stringify([
          "personal",
          "summary",
          "experience",
          "education",
          "certifications",
          "skills",
        ]),
        isDefault: true,
        isShared: true,
        layoutConfig: JSON.stringify({
          spacing: { section: 25, item: 12 },
          alignment: "left",
          headerStyle: "centered",
        }),
        existingResumeTemplate: null,
      },
    ];
  }

  // Get default template by ID
  getDefaultTemplateById(templateId) {
    const defaultTemplates = this.getDefaultTemplates();
    return defaultTemplates.find((t) => t.id === templateId) || null;
  }

  // Generate template preview HTML
  generateTemplatePreview(template) {
    const colors =
      typeof template.colors === "string"
        ? JSON.parse(template.colors)
        : template.colors || {};
    const fonts =
      typeof template.fonts === "string"
        ? JSON.parse(template.fonts)
        : template.fonts || {};
    const sectionOrder =
      typeof template.sectionOrder === "string"
        ? JSON.parse(template.sectionOrder)
        : template.sectionOrder || [];

    const primaryColor = colors.primary || "#3351FD";
    const secondaryColor = colors.secondary || "#000000";
    const backgroundColor = colors.background || "#FFFFFF";
    const textColor = colors.text || "#000000";
    const headingFont = fonts.heading || "Inter";
    const bodyFont = fonts.body || "Inter";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.templateName} - Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: '${bodyFont}', Arial, sans-serif;
            background: ${backgroundColor};
            color: ${textColor};
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
        }
        .preview-container {
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-height: 600px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 {
            font-family: '${headingFont}', Arial, sans-serif;
            color: ${primaryColor};
            font-size: ${fonts.size?.heading || "28px"};
            margin-bottom: 10px;
        }
        .contact-info {
            color: ${secondaryColor};
            font-size: 12px;
            margin-top: 10px;
        }
        .section {
            margin-bottom: 25px;
        }
        h2 {
            font-family: '${headingFont}', Arial, sans-serif;
            color: ${primaryColor};
            border-bottom: 2px solid ${primaryColor};
            padding-bottom: 5px;
            margin-bottom: 15px;
            font-size: ${
              fonts.size?.heading ? `calc(${fonts.size.heading} - 4px)` : "20px"
            };
        }
        .section-content {
            font-size: ${fonts.size?.body || "12px"};
            line-height: 1.8;
        }
        .experience-item, .education-item {
            margin-bottom: 15px;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .item-title {
            font-weight: bold;
            color: ${textColor};
        }
        .item-date {
            color: ${secondaryColor};
            font-size: 11px;
        }
        .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .skill-tag {
            background: ${primaryColor};
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 11px;
        }
        .template-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="header">
            <h1>John Doe</h1>
            <div class="contact-info">
                john.doe@example.com • (555) 123-4567 • San Francisco, CA
            </div>
        </div>

        <div class="section">
            <h2>Summary</h2>
            <div class="section-content">
                Experienced professional with 5+ years of expertise in software development and project management. 
                Proven track record of delivering high-quality solutions and leading cross-functional teams.
            </div>
        </div>

        <div class="section">
            <h2>Experience</h2>
            <div class="experience-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">Senior Software Engineer</span> - Tech Company
                    </div>
                    <div class="item-date">2020 - Present</div>
                </div>
                <div class="section-content">
                    <ul>
                        <li>Led development of scalable web applications serving 100K+ users</li>
                        <li>Mentored junior developers and improved team productivity by 30%</li>
                        <li>Implemented CI/CD pipelines reducing deployment time by 50%</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Education</h2>
            <div class="education-item">
                <div class="item-header">
                    <div>
                        <span class="item-title">Bachelor of Science in Computer Science</span> - University Name
                    </div>
                    <div class="item-date">2018</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Skills</h2>
            <div class="skills-list">
                <span class="skill-tag">JavaScript</span>
                <span class="skill-tag">React</span>
                <span class="skill-tag">Node.js</span>
                <span class="skill-tag">Python</span>
                <span class="skill-tag">AWS</span>
            </div>
        </div>

        <div class="template-info">
            <strong>Template:</strong> ${template.templateName} | 
            <strong>Type:</strong> ${
              template.templateType || "chronological"
            } | 
            <strong>Style:</strong> Professional
        </div>
    </div>
</body>
</html>`;
  }

  // Get template by ID (includes default templates)
  async getTemplateById(templateId) {
    try {
      // Check if it's a default template first
      if (templateId.startsWith("default-")) {
        const defaultTemplate = this.getDefaultTemplateById(templateId);
        if (defaultTemplate) {
          return this.mapRowToTemplate(defaultTemplate);
        }
      }

      // Otherwise, get from database
      const query = `
        SELECT id, template_name, description, colors, fonts, existing_resume_template
        FROM resume_template
        WHERE id = $1
      `;

      const result = await database.query(query, [templateId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      console.error("❌ Error getting template by ID:", error);
      throw error;
    }
  }

  // Get template preview HTML
  async getTemplatePreview(templateId) {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      return this.generateTemplatePreview(template);
    } catch (error) {
      console.error("❌ Error generating template preview:", error);
      throw error;
    }
  }

  // Update template
  async updateTemplate(templateId, templateData) {
    const { templateName, description, colors, fonts, existingResumeTemplate } =
      templateData;

    try {
      // Check if template exists
      const existingTemplate = await this.getTemplateById(templateId);
      if (!existingTemplate) {
        throw new Error("Template not found");
      }

      // Validate field lengths
      if (templateName && templateName.length > this.maxTemplateNameLength) {
        throw new Error(
          `Template name must be less than ${this.maxTemplateNameLength} characters`
        );
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (templateName !== undefined) {
        updates.push(`template_name = $${paramCount++}`);
        values.push(templateName || null);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description || null);
      }

      if (colors !== undefined) {
        updates.push(`colors = $${paramCount++}`);
        values.push(colors || null);
      }

      if (fonts !== undefined) {
        updates.push(`fonts = $${paramCount++}`);
        values.push(fonts || null);
      }

      if (existingResumeTemplate !== undefined) {
        updates.push(`existing_resume_template = $${paramCount++}`);
        values.push(existingResumeTemplate || null);
      }

      if (updates.length === 0) {
        return existingTemplate;
      }

      values.push(templateId);

      const query = `
        UPDATE resume_template
        SET ${updates.join(", ")}
        WHERE id = $${paramCount++}
        RETURNING id, template_name, description, colors, fonts, existing_resume_template
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Template not found or update failed");
      }

      return this.mapRowToTemplate(result.rows[0]);
    } catch (error) {
      console.error("❌ Error updating template:", error);
      throw error;
    }
  }

  // Delete template
  async deleteTemplate(templateId) {
    try {
      const query = `
        DELETE FROM resume_template
        WHERE id = $1
        RETURNING id
      `;

      const result = await database.query(query, [templateId]);

      if (result.rows.length === 0) {
        throw new Error("Template not found");
      }

      return { id: result.rows[0].id };
    } catch (error) {
      console.error("❌ Error deleting template:", error);
      throw error;
    }
  }

  // Map database row to template object
  mapRowToTemplate(row) {
    // Handle both database rows and default template objects
    const template = {
      id: row.id,
      templateName: row.template_name || row.templateName,
      description: row.description,
      colors: row.colors,
      fonts: row.fonts,
      existingResumeTemplate:
        row.existing_resume_template || row.existingResumeTemplate,
    };

    // Add additional fields if they exist (for default templates)
    if (row.templateType !== undefined)
      template.templateType = row.templateType;
    if (row.sectionOrder !== undefined) {
      // Parse if it's a string, otherwise use as-is
      if (typeof row.sectionOrder === "string") {
        try {
          template.sectionOrder = JSON.parse(row.sectionOrder);
        } catch {
          template.sectionOrder = row.sectionOrder;
        }
      } else {
        template.sectionOrder = row.sectionOrder;
      }
    }
    if (row.isDefault !== undefined) template.isDefault = row.isDefault;
    if (row.isShared !== undefined) template.isShared = row.isShared;
    if (row.layoutConfig !== undefined) {
      // Parse if it's a string, otherwise use as-is
      if (typeof row.layoutConfig === "string") {
        try {
          template.layoutConfig = JSON.parse(row.layoutConfig);
        } catch {
          template.layoutConfig = row.layoutConfig;
        }
      } else {
        template.layoutConfig = row.layoutConfig;
      }
    }

    return template;
  }
}

export default new ResumeTemplateService();
