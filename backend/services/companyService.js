import { URL } from "url";

class CompanyService {
  constructor() {
    this.requestTimeout = 5000; // 5 seconds timeout
  }

  /**
   * Extract domain from URL
   */
  extractDomain(urlString) {
    try {
      const parsed = new URL(urlString);
      if (!parsed.hostname) {
        return null;
      }
      // Remove www. prefix
      return parsed.hostname.replace(/^www\./, "");
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }
  }

  /**
   * Get company website from job posting URL
   */
  getCompanyWebsite(jobPostingUrl) {
    if (!jobPostingUrl) {
      return null;
    }

    const domain = this.extractDomain(jobPostingUrl);
    if (!domain) {
      return null;
    }

    // Try to determine if it's a job board or company site
    const jobBoards = [
      "linkedin.com",
      "indeed.com",
      "glassdoor.com",
      "monster.com",
      "ziprecruiter.com",
      "dice.com",
      "careerbuilder.com",
      "simplyhired.com",
      "jobvite.com",
      "greenhouse.io",
      "lever.co",
      "workday.com",
    ];

    const isJobBoard = jobBoards.some((board) => domain.includes(board));

    if (isJobBoard) {
      // For job boards, we can't reliably get the company website
      // Return null and let the frontend handle it
      return null;
    }

    // If it's not a known job board, assume it's the company's site
    return `https://${domain}`;
  }

  /**
   * Fetch company information from job posting URL
   * This is a basic implementation that extracts what it can from the URL
   */
  async getCompanyInformation(jobPostingUrl, companyName) {
    try {
      const website = this.getCompanyWebsite(jobPostingUrl);
      const domain = jobPostingUrl ? this.extractDomain(jobPostingUrl) : null;

      // Basic company information that we can infer
      const companyInfo = {
        name: companyName || "Unknown Company",
        website: website,
        domain: domain,
        logo: website ? this.getCompanyLogoUrl(website) : null,
        // These would typically come from an external API or scraping
        // For now, we'll return null and let the frontend handle display
        size: null,
        industry: null,
        description: null,
        mission: null,
        founded: null,
        headquarters: null,
      };

      // Try to get favicon/logo
      if (website) {
        companyInfo.logo = this.getCompanyLogoUrl(website);
      }

      return companyInfo;
    } catch (error) {
      console.error("Error fetching company information:", error);
      return {
        name: companyName || "Unknown Company",
        website: null,
        domain: null,
        logo: null,
        size: null,
        industry: null,
        description: null,
        mission: null,
        founded: null,
        headquarters: null,
      };
    }
  }

  /**
   * Get company logo URL (favicon or common logo paths)
   */
  getCompanyLogoUrl(website) {
    if (!website) {
      return null;
    }

    try {
      const parsed = new URL(website);
      const baseUrl = `${parsed.protocol}//${parsed.hostname}`;

      // Common logo paths to try
      const logoPaths = [
        "/logo.png",
        "/logo.svg",
        "/favicon.ico",
        "/assets/logo.png",
        "/images/logo.png",
        "/img/logo.png",
      ];

      // Return the first common path (frontend can try multiple)
      return `${baseUrl}${logoPaths[0]}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Try to fetch company description from website (basic implementation)
   * This would typically require web scraping or an API
   */
  async fetchCompanyDescription(website) {
    if (!website) {
      return null;
    }

    try {
      // This is a placeholder - in a real implementation, you might:
      // 1. Use a web scraping service
      // 2. Use an API like Clearbit or SimilarWeb
      // 3. Use structured data from the website
      // For now, return null
      return null;
    } catch (error) {
      console.error("Error fetching company description:", error);
      return null;
    }
  }
}

export default new CompanyService();

