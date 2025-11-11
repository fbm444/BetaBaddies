import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import database from "../database.js";

class CoverLetterTemplateService {
  constructor() {
    this.maxTemplateNameLength = 255;
    this.maxFilePathLength = 1000;
    // Namespace UUID for deterministic UUID generation from default template IDs
    this.DEFAULT_TEMPLATE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  }

  // Generate deterministic UUID from default template ID
  generateDefaultTemplateUUID(defaultId) {
    return uuidv5(defaultId, this.DEFAULT_TEMPLATE_NAMESPACE);
  }

  // Create a new cover letter template
  async createTemplate(templateData) {
    const {
      templateName,
      description,
      tone,
      length,
      writingStyle,
      colors,
      fonts,
      existingCoverLetterTemplate,
      industry,
      id, // Allow specifying ID for default templates
    } = templateData;

    try {
      // Validate template name if provided
      if (templateName && templateName.length > this.maxTemplateNameLength) {
        throw new Error(
          `Template name must be less than ${this.maxTemplateNameLength} characters`
        );
      }

      // Validate tone and length
      const validTones = ["formal", "casual", "enthusiastic", "analytical"];
      const validLengths = ["brief", "standard", "detailed"];

      if (tone && !validTones.includes(tone)) {
        throw new Error(
          `Invalid tone. Must be one of: ${validTones.join(", ")}`
        );
      }

      if (length && !validLengths.includes(length)) {
        throw new Error(
          `Invalid length. Must be one of: ${validLengths.join(", ")}`
        );
      }

      // Use provided ID if available (for default templates), otherwise generate new UUID
      // If ID is a default template ID (starts with "default-"), convert to UUID
      let templateId;
      if (id) {
        if (id.startsWith("default-")) {
          templateId = this.generateDefaultTemplateUUID(id);
        } else {
          templateId = id;
        }
      } else {
        templateId = uuidv4();
      }

      const query = `
        INSERT INTO coverletter_template (id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
      `;

      try {
        const result = await database.query(query, [
          templateId,
          templateName || null,
          description || null,
          tone || "formal",
          length || "standard",
          writingStyle || null,
          colors ? JSON.stringify(colors) : null,
          fonts ? JSON.stringify(fonts) : null,
          existingCoverLetterTemplate || null,
        ]);

        return this.mapRowToTemplate(result.rows[0]);
      } catch (error) {
        // If template already exists (unique constraint violation), fetch and return it
        if (error.code === "23505" || error.message.includes("duplicate") || error.message.includes("unique")) {
          console.log(`Template with ID ${templateId} already exists, fetching it...`);
          const existingQuery = `
            SELECT id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
            FROM coverletter_template
            WHERE id = $1
          `;
          const existingResult = await database.query(existingQuery, [templateId]);
          if (existingResult.rows.length > 0) {
            return this.mapRowToTemplate(existingResult.rows[0]);
          }
        }
        console.error("❌ Error creating template:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ Error creating template:", error);
      throw error;
    }
  }

  // Get all templates (includes default templates)
  async getTemplates(options = {}) {
    try {
      const { templateName, industry, includeDefaults = true } = options;

      let dbTemplates = [];

      // Try to get templates from database
      try {
        let query = `
          SELECT id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
          FROM coverletter_template
        `;

        const params = [];
        const conditions = [];
        if (templateName) {
          conditions.push(`template_name = $${params.length + 1}`);
          params.push(templateName);
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += ` ORDER BY template_name ASC`;

        const result = await database.query(query, params);
        dbTemplates = result.rows.map(this.mapRowToTemplate);
      } catch (dbError) {
        console.log(
          "⚠️ Could not fetch templates from database (table may not exist):",
          dbError.message
        );
        dbTemplates = [];
      }

      // Add default templates if requested
      if (includeDefaults) {
        const defaultTemplates = this.getDefaultTemplates(industry);
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
  getDefaultTemplates(industry = null) {
    const allTemplates = [
      {
        id: "default-formal",
        templateName: "Formal Professional",
        templateType: "formal",
        industry: "general",
        description:
          "Traditional, formal tone perfect for corporate positions, finance, law, and government roles.",
        tone: "formal",
        length: "standard",
        writingStyle: "direct",
        colors: JSON.stringify({
          primary: "#000000",
          secondary: "#333333",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F5F5F5",
        }),
        fonts: JSON.stringify({
          heading: "Times New Roman",
          body: "Times New Roman",
          size: { heading: "14pt", body: "11pt" },
        }),
        isDefault: true,
        isShared: true,
        existingCoverLetterTemplate: null,
      },
      {
        id: "default-creative",
        templateName: "Creative & Modern",
        templateType: "enthusiastic",
        industry: "creative",
        description:
          "Energetic and creative tone ideal for design, marketing, advertising, and startup roles.",
        tone: "enthusiastic",
        length: "standard",
        writingStyle: "narrative",
        colors: JSON.stringify({
          primary: "#3351FD",
          secondary: "#000000",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F0F4FF",
        }),
        fonts: JSON.stringify({
          heading: "Arial",
          body: "Arial",
          size: { heading: "14pt", body: "11pt" },
        }),
        isDefault: true,
        isShared: true,
        existingCoverLetterTemplate: null,
      },
      {
        id: "default-technical",
        templateName: "Technical Professional",
        templateType: "analytical",
        industry: "technology",
        description:
          "Analytical and precise tone perfect for engineering, software development, and technical roles.",
        tone: "analytical",
        length: "detailed",
        writingStyle: "direct",
        colors: JSON.stringify({
          primary: "#1A1A1A",
          secondary: "#4A4A4A",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F8F8F8",
        }),
        fonts: JSON.stringify({
          heading: "Calibri",
          body: "Calibri",
          size: { heading: "14pt", body: "11pt" },
        }),
        isDefault: true,
        isShared: true,
        existingCoverLetterTemplate: null,
      },
      {
        id: "default-brief",
        templateName: "Brief & Concise",
        templateType: "formal",
        industry: "general",
        description:
          "Short and to-the-point format. Perfect for email applications or when brevity is required.",
        tone: "formal",
        length: "brief",
        writingStyle: "direct",
        colors: JSON.stringify({
          primary: "#000000",
          secondary: "#666666",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#FAFAFA",
        }),
        fonts: JSON.stringify({
          heading: "Arial",
          body: "Arial",
          size: { heading: "12pt", body: "10pt" },
        }),
        isDefault: true,
        isShared: true,
        existingCoverLetterTemplate: null,
      },
      {
        id: "default-casual",
        templateName: "Casual & Friendly",
        templateType: "casual",
        industry: "startup",
        description:
          "Friendly and approachable tone ideal for startup culture, creative agencies, and informal workplaces.",
        tone: "casual",
        length: "standard",
        writingStyle: "narrative",
        colors: JSON.stringify({
          primary: "#3351FD",
          secondary: "#000000",
          text: "#000000",
          background: "#FFFFFF",
          accent: "#F5F5F5",
        }),
        fonts: JSON.stringify({
          heading: "Helvetica",
          body: "Helvetica",
          size: { heading: "14pt", body: "11pt" },
        }),
        isDefault: true,
        isShared: true,
        existingCoverLetterTemplate: null,
      },
    ];

    // Filter by industry if specified
    if (industry) {
      return allTemplates.filter(
        (t) => t.industry === industry || t.industry === "general"
      );
    }

    return allTemplates;
  }

  // Get default template by ID
  getDefaultTemplateById(templateId) {
    const defaultTemplates = this.getDefaultTemplates();
    return defaultTemplates.find((t) => t.id === templateId) || null;
  }

  // Get sample content based on tone
  getSampleContentByTone(tone) {
    const toneSamples = {
      formal: {
        greeting: "Dear Hiring Manager,",
        opening: "I am writing to express my strong interest in the [Position Title] position at [Company Name]. With my extensive background in [Relevant Field] and demonstrated expertise, I am confident that I would be a valuable addition to your organization.",
        body: [
          "In my current role at [Previous Company], I have successfully [Key Achievement], resulting in [Quantifiable Result]. My experience in [Relevant Skills] and proven ability to [Key Competency] align perfectly with the requirements of this position.",
          "I am particularly drawn to [Company Name] because of your reputation for [Company Strength] and commitment to [Company Value]. I am eager to contribute to your team's continued success and bring my expertise in [Relevant Area] to help achieve your strategic objectives.",
        ],
        closing: "Thank you for considering my application. I would welcome the opportunity to discuss how my qualifications and experience can contribute to [Company Name]'s continued growth and success. I look forward to hearing from you.",
        signature: "Sincerely,",
      },
      casual: {
        greeting: "Hi [Hiring Manager Name],",
        opening: "I'm really excited about the [Position Title] role at [Company Name]! I've been following your work for a while, and I think my background in [Relevant Field] would be a great fit for what you're looking for.",
        body: [
          "At [Previous Company], I've had the chance to [Key Achievement], which was really rewarding. I love working with [Relevant Skills] and I'm always looking for ways to [Key Competency] - something I know is important at [Company Name].",
          "What really stands out to me about [Company Name] is [Company Strength]. I'm passionate about [Relevant Area] and I'd love to bring that energy to your team. I think we'd work really well together!",
        ],
        closing: "Thanks so much for taking the time to review my application. I'd love to chat more about how I can help [Company Name] continue to do great things. Looking forward to hearing from you!",
        signature: "Best regards,",
      },
      enthusiastic: {
        greeting: "Dear [Hiring Manager Name],",
        opening: "I am absolutely thrilled about the opportunity to apply for the [Position Title] position at [Company Name]! Your innovative approach to [Industry/Field] has inspired me, and I am eager to bring my passion and expertise to your exceptional team.",
        body: [
          "Throughout my career at [Previous Company], I've had the incredible opportunity to [Key Achievement], which led to [Quantifiable Result]! I'm genuinely excited about [Relevant Skills] and I thrive on [Key Competency] - qualities I know are essential at [Company Name].",
          "What excites me most about [Company Name] is your commitment to [Company Strength] and your forward-thinking approach to [Company Value]. I'm passionate about [Relevant Area] and I can't wait to contribute to your team's amazing work!",
        ],
        closing: "Thank you for considering my application! I am genuinely excited about the possibility of joining [Company Name] and contributing to your continued success. I would love the opportunity to discuss how my enthusiasm and experience can make a positive impact!",
        signature: "With enthusiasm,",
      },
      analytical: {
        greeting: "Dear Hiring Manager,",
        opening: "I am writing to apply for the [Position Title] position at [Company Name]. Based on my analysis of the role requirements and my professional background in [Relevant Field], I believe my qualifications align well with your needs.",
        body: [
          "In my role at [Previous Company], I implemented [Key Achievement], which resulted in [Quantifiable Result]. My technical expertise in [Relevant Skills] and systematic approach to [Key Competency] have consistently delivered measurable outcomes.",
          "I am interested in [Company Name] due to your data-driven approach to [Company Strength] and your focus on [Company Value]. My analytical skills in [Relevant Area] would enable me to contribute effectively to your team's objectives.",
        ],
        closing: "I appreciate your consideration of my application. I would welcome the opportunity to discuss how my analytical approach and technical expertise can contribute to [Company Name]'s strategic goals. I look forward to your response.",
        signature: "Respectfully,",
      },
    };

    return toneSamples[tone] || toneSamples.formal;
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

    const primaryColor = colors.primary || "#000000";
    const backgroundColor = colors.background || "#FFFFFF";
    const textColor = colors.text || "#000000";
    const headingFont = fonts.heading || "Arial";
    const bodyFont = fonts.body || "Arial";
    const tone = template.tone || "formal";
    
    // Get tone-specific sample content
    const sampleContent = this.getSampleContentByTone(tone);

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
            padding: 40px;
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
        .date {
            text-align: right;
            margin-bottom: 20px;
            font-size: 11pt;
            color: #666;
        }
        .recipient {
            margin-bottom: 20px;
            font-size: 11pt;
        }
        .greeting {
            margin-bottom: 20px;
            font-size: 11pt;
        }
        .body {
            margin-bottom: 20px;
            font-size: 11pt;
            text-align: justify;
        }
        .paragraph {
            margin-bottom: 15px;
        }
        .closing {
            margin-top: 30px;
            margin-bottom: 10px;
            font-size: 11pt;
        }
        .signature {
            margin-top: 40px;
            font-size: 11pt;
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
        <div class="date">${new Date().toLocaleDateString()}</div>
        
        <div class="recipient">
            [Hiring Manager Name]<br>
            [Company Name]<br>
            [Company Address]
        </div>

        <div class="greeting">${sampleContent.greeting}</div>

        <div class="body">
            <div class="paragraph">
                ${sampleContent.opening}
            </div>
            ${sampleContent.body.map((para) => `<div class="paragraph">${para}</div>`).join('')}
        </div>

        <div class="closing">
            ${sampleContent.closing}
        </div>

        <div class="signature">
            ${sampleContent.signature}<br>
            [Your Name]
        </div>

        <div class="template-info">
            <strong>Template:</strong> ${template.templateName} | 
            <strong>Tone:</strong> ${tone} | 
            <strong>Length:</strong> ${template.length || "standard"} | 
            <strong>Style:</strong> ${template.writingStyle || "direct"}
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
          // Convert default template ID to deterministic UUID
          const templateUUID = this.generateDefaultTemplateUUID(templateId);
          
          // Check if this default template exists in database
          const dbQuery = `
            SELECT id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
            FROM coverletter_template
            WHERE id = $1
          `;
          
          try {
            const dbResult = await database.query(dbQuery, [templateUUID]);
            if (dbResult.rows.length > 0) {
              // Template exists in database, return it (but map the ID back to default- format for consistency)
              const mapped = this.mapRowToTemplate(dbResult.rows[0]);
              mapped.id = templateId; // Keep the original default- ID for frontend
              return mapped;
            }
          } catch (dbError) {
            // Table might not exist or query failed, continue to create
            console.log("Template not in database, will create:", dbError.message);
          }

          // Template doesn't exist in database, create it with deterministic UUID
          try {
            const createdTemplate = await this.createTemplate({
              id: templateUUID, // Use deterministic UUID
              templateName: defaultTemplate.templateName,
              description: defaultTemplate.description,
              tone: defaultTemplate.tone,
              length: defaultTemplate.length,
              writingStyle: defaultTemplate.writingStyle,
              colors: defaultTemplate.colors,
              fonts: defaultTemplate.fonts,
              existingCoverLetterTemplate: defaultTemplate.existingCoverLetterTemplate,
            });
            
            // Map ID back to default- format for consistency
            createdTemplate.id = templateId;
            return createdTemplate;
          } catch (createError) {
            console.error("Failed to create default template in database:", createError);
            // Fallback: return the default template object even if DB creation fails
            return this.mapRowToTemplate(defaultTemplate);
          }
        }
      }

      // Otherwise, get from database
      const query = `
        SELECT id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
        FROM coverletter_template
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
    const {
      templateName,
      description,
      tone,
      length,
      writingStyle,
      colors,
      fonts,
      existingCoverLetterTemplate,
    } = templateData;

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

      // Validate tone and length
      const validTones = ["formal", "casual", "enthusiastic", "analytical"];
      const validLengths = ["brief", "standard", "detailed"];

      if (tone && !validTones.includes(tone)) {
        throw new Error(
          `Invalid tone. Must be one of: ${validTones.join(", ")}`
        );
      }

      if (length && !validLengths.includes(length)) {
        throw new Error(
          `Invalid length. Must be one of: ${validLengths.join(", ")}`
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

      if (tone !== undefined) {
        updates.push(`tone = $${paramCount++}`);
        values.push(tone || "formal");
      }

      if (length !== undefined) {
        updates.push(`length = $${paramCount++}`);
        values.push(length || "standard");
      }

      if (writingStyle !== undefined) {
        updates.push(`writing_style = $${paramCount++}`);
        values.push(writingStyle || null);
      }

      if (colors !== undefined) {
        updates.push(`colors = $${paramCount++}`);
        values.push(colors || null);
      }

      if (fonts !== undefined) {
        updates.push(`fonts = $${paramCount++}`);
        values.push(fonts || null);
      }

      if (existingCoverLetterTemplate !== undefined) {
        updates.push(`existing_coverletter_template = $${paramCount++}`);
        values.push(existingCoverLetterTemplate || null);
      }

      if (updates.length === 0) {
        return existingTemplate;
      }

      values.push(templateId);

      const query = `
        UPDATE coverletter_template
        SET ${updates.join(", ")}
        WHERE id = $${paramCount++}
        RETURNING id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template
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
        DELETE FROM coverletter_template
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

  // Track template usage
  async trackTemplateUsage(templateId, userId) {
    try {
      const query = `
        INSERT INTO cover_letter_template_usage (template_id, user_id, usage_count, last_used_at)
        VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (template_id, user_id) 
        DO UPDATE SET 
          usage_count = cover_letter_template_usage.usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP
        RETURNING id, usage_count, last_used_at
      `;

      const result = await database.query(query, [templateId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error tracking template usage:", error);
      // Don't throw - this is non-critical
      return null;
    }
  }

  // Get template usage analytics
  async getTemplateUsageAnalytics(templateId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_uses,
          COUNT(DISTINCT user_id) as unique_users,
          MAX(last_used_at) as last_used
        FROM cover_letter_template_usage
        WHERE template_id = $1
      `;

      const result = await database.query(query, [templateId]);
      return result.rows[0] || { total_uses: 0, unique_users: 0, last_used: null };
    } catch (error) {
      console.error("❌ Error getting template usage analytics:", error);
      return { total_uses: 0, unique_users: 0, last_used: null };
    }
  }

  // Map database row to template object
  mapRowToTemplate(row) {
    const template = {
      id: row.id,
      templateName: row.template_name || row.templateName,
      description: row.description,
      tone: row.tone,
      length: row.length,
      writingStyle: row.writing_style || row.writingStyle,
      colors: row.colors,
      fonts: row.fonts,
      existingCoverLetterTemplate:
        row.existing_coverletter_template || row.existingCoverLetterTemplate,
    };

    // Add additional fields if they exist (for default templates)
    if (row.templateType !== undefined) template.templateType = row.templateType;
    if (row.industry !== undefined) template.industry = row.industry;
    if (row.isDefault !== undefined) template.isDefault = row.isDefault;
    if (row.isShared !== undefined) template.isShared = row.isShared;

    return template;
  }
}

export default new CoverLetterTemplateService();

