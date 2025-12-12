import axios from "axios";
import { wrapApiCall } from "../../utils/apiCallWrapper.js";

class AbstractApiService {
  constructor() {
    this.apiKey = process.env.ABSTRACTAPI_KEY;
    this.baseUrl = "https://companyenrichment.abstractapi.com/v1/";
  }

  /**
   * Enrich company data using Abstract API
   * @param {string} domain - Company domain (e.g., "google.com")
   * @param {number} userId - Optional user ID for tracking
   */
  async enrichCompany(domain, userId = null) {
    if (!this.apiKey) {
      console.warn("⚠️ Abstract API key not configured");
      return null;
    }

    return wrapApiCall({
      serviceName: "abstract_api",
      endpoint: "enrichCompany",
      userId,
      apiCall: async () => {
        const response = await axios.get(this.baseUrl, {
          params: {
            api_key: this.apiKey,
            domain: domain,
          },
        });
        return response;
      },
      fallback: async (error) => {
        // Fallback: return minimal data structure
        console.warn("Using fallback for Abstract API enrichment");
        return {
          data: {
            domain: domain,
            name: null,
            industry: null,
            employees_count: null,
            year_founded: null,
            description: null,
            locality: null,
            country: null,
            linkedin_url: null,
            logo: null,
          },
        };
      },
    }).then((response) => {
      const data = response.data;
      return {
        name: data.name || null,
        domain: data.domain || domain,
        industry: data.industry || null,
        employeeCount: data.employees_count || data.company_size || null,
        foundedYear: data.year_founded || null,
        description: data.description || null,
        locality: data.locality || null,
        country: data.country || null,
        linkedinUrl: data.linkedin_url || null,
        logoUrl: data.logo || null,
      };
    }).catch(() => {
      // Return null if both API and fallback fail
      return null;
    });
  }

  /**
   * Extract domain from company name or URL
   */
  extractDomain(companyNameOrUrl) {
    // If it looks like a URL, extract domain
    if (companyNameOrUrl.includes("http") || companyNameOrUrl.includes("www")) {
      try {
        const url = new URL(
          companyNameOrUrl.startsWith("http")
            ? companyNameOrUrl
            : `https://${companyNameOrUrl}`
        );
        return url.hostname.replace("www.", "");
      } catch (err) {
        // Fallback if URL parsing fails
      }
    }

    // Otherwise try to construct domain from company name
    const cleanName = companyNameOrUrl
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    return `${cleanName}.com`;
  }
}

export default new AbstractApiService();

