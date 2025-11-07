import database from "./database.js";
import resumeService from "./resumeService.js";

class ResumeSectionService {
  constructor() {
    this.defaultSections = [
      { id: "personal", label: "Personal Info", order: 0 },
      { id: "summary", label: "Summary", order: 1 },
      { id: "experience", label: "Experience", order: 2 },
      { id: "education", label: "Education", order: 3 },
      { id: "skills", label: "Skills", order: 4 },
      { id: "projects", label: "Projects", order: 5 },
      { id: "certifications", label: "Certifications", order: 6 },
    ];
  }

  // Get section configuration for a resume
  async getSectionConfig(resumeId, userId) {
    try {
      const resume = await resumeService.getResumeById(resumeId, userId);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // If resume has section_config JSONB, parse it
      // Otherwise return default configuration
      if (resume.sectionConfig) {
        return resume.sectionConfig;
      }

      // Return default section configuration
      const defaultConfig = {};
      this.defaultSections.forEach((section) => {
        defaultConfig[section.id] = {
          enabled: true,
          order: section.order,
        };
      });

      return defaultConfig;
    } catch (error) {
      console.error("❌ Error getting section config:", error);
      throw error;
    }
  }

  // Update section configuration
  async updateSectionConfig(resumeId, userId, sectionConfig) {
    try {
      // Validate section config structure
      this.validateSectionConfig(sectionConfig);

      // Update resume with new section config
      const resume = await resumeService.updateResume(resumeId, userId, {
        sectionConfig: JSON.stringify(sectionConfig),
      });

      return resume.sectionConfig || sectionConfig;
    } catch (error) {
      console.error("❌ Error updating section config:", error);
      throw error;
    }
  }

  // Toggle section on/off
  async toggleSection(resumeId, userId, sectionId, enabled) {
    try {
      const currentConfig = await this.getSectionConfig(resumeId, userId);

      if (!currentConfig[sectionId]) {
        throw new Error(`Section '${sectionId}' not found`);
      }

      currentConfig[sectionId].enabled = enabled;

      return await this.updateSectionConfig(resumeId, userId, currentConfig);
    } catch (error) {
      console.error("❌ Error toggling section:", error);
      throw error;
    }
  }

  // Reorder sections
  async reorderSections(resumeId, userId, newOrder) {
    try {
      if (!Array.isArray(newOrder)) {
        throw new Error("New order must be an array of section IDs");
      }

      const currentConfig = await this.getSectionConfig(resumeId, userId);

      // Validate all sections in new order exist
      newOrder.forEach((sectionId) => {
        if (!currentConfig[sectionId]) {
          throw new Error(`Section '${sectionId}' not found`);
        }
      });

      // Update order for each section
      newOrder.forEach((sectionId, index) => {
        if (currentConfig[sectionId]) {
          currentConfig[sectionId].order = index;
        }
      });

      // Ensure all sections have an order (for sections not in newOrder)
      Object.keys(currentConfig).forEach((sectionId) => {
        if (!newOrder.includes(sectionId)) {
          currentConfig[sectionId].order = 999; // Put at end
        }
      });

      return await this.updateSectionConfig(resumeId, userId, currentConfig);
    } catch (error) {
      console.error("❌ Error reordering sections:", error);
      throw error;
    }
  }

  // Save section preset
  async saveSectionPreset(userId, presetName, sectionConfig) {
    try {
      // Validate section config
      this.validateSectionConfig(sectionConfig);

      // Store preset (you might want a separate table for this)
      // For now, we'll store it as a template or in user preferences
      // This is a placeholder - implement based on your needs

      return {
        id: `preset_${Date.now()}`,
        name: presetName,
        sectionConfig,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error saving section preset:", error);
      throw error;
    }
  }

  // Get section presets
  async getSectionPresets(userId) {
    try {
      // Return default presets
      // In a full implementation, you'd fetch from database
      return [
        {
          id: "default",
          name: "Default",
          sectionConfig: this.getDefaultSectionConfig(),
        },
        {
          id: "minimal",
          name: "Minimal",
          sectionConfig: {
            personal: { enabled: true, order: 0 },
            summary: { enabled: true, order: 1 },
            experience: { enabled: true, order: 2 },
            education: { enabled: true, order: 3 },
            skills: { enabled: true, order: 4 },
            projects: { enabled: false, order: 5 },
            certifications: { enabled: false, order: 6 },
          },
        },
        {
          id: "comprehensive",
          name: "Comprehensive",
          sectionConfig: {
            personal: { enabled: true, order: 0 },
            summary: { enabled: true, order: 1 },
            experience: { enabled: true, order: 2 },
            education: { enabled: true, order: 3 },
            skills: { enabled: true, order: 4 },
            projects: { enabled: true, order: 5 },
            certifications: { enabled: true, order: 6 },
          },
        },
      ];
    } catch (error) {
      console.error("❌ Error getting section presets:", error);
      throw error;
    }
  }

  // Apply section preset to resume
  async applySectionPreset(resumeId, userId, presetId) {
    try {
      const presets = await this.getSectionPresets(userId);
      const preset = presets.find((p) => p.id === presetId);

      if (!preset) {
        throw new Error(`Preset '${presetId}' not found`);
      }

      return await this.updateSectionConfig(resumeId, userId, preset.sectionConfig);
    } catch (error) {
      console.error("❌ Error applying section preset:", error);
      throw error;
    }
  }

  // Validate section configuration structure
  validateSectionConfig(sectionConfig) {
    if (!sectionConfig || typeof sectionConfig !== "object") {
      throw new Error("Section config must be an object");
    }

    Object.keys(sectionConfig).forEach((sectionId) => {
      const section = sectionConfig[sectionId];
      if (typeof section !== "object") {
        throw new Error(`Section '${sectionId}' must be an object`);
      }

      if (typeof section.enabled !== "boolean") {
        throw new Error(`Section '${sectionId}' must have 'enabled' boolean property`);
      }

      if (typeof section.order !== "number") {
        throw new Error(`Section '${sectionId}' must have 'order' number property`);
      }
    });
  }

  // Get default section configuration
  getDefaultSectionConfig() {
    const config = {};
    this.defaultSections.forEach((section) => {
      config[section.id] = {
        enabled: true,
        order: section.order,
      };
    });
    return config;
  }
}

export default new ResumeSectionService();

