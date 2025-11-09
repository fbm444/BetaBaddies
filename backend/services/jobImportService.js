import { URL } from "url";
import axios from "axios";

class JobImportService {
  constructor() {
    this.requestTimeout = 10000; // 10 seconds timeout
    this.supportedJobBoards = {
      linkedin: {
        domains: ["linkedin.com", "www.linkedin.com"],
        extractCompany: (url) => this.extractLinkedInCompany(url),
        extractTitle: (url) => this.extractLinkedInTitle(url),
      },
      indeed: {
        domains: ["indeed.com", "www.indeed.com"],
        extractCompany: (url) => this.extractIndeedCompany(url),
        extractTitle: (url) => this.extractIndeedTitle(url),
      },
      glassdoor: {
        domains: ["glassdoor.com", "www.glassdoor.com"],
        extractCompany: (url) => this.extractGlassdoorCompany(url),
        extractTitle: (url) => this.extractGlassdoorTitle(url),
      },
    };
  }

  /**
   * Validate URL format
   */
  validateUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(urlString) {
    try {
      const url = new URL(urlString);
      return url.hostname.replace(/^www\./, "");
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect which job board the URL belongs to
   */
  detectJobBoard(urlString) {
    const domain = this.extractDomain(urlString);
    if (!domain) {
      return null;
    }

    for (const [board, config] of Object.entries(this.supportedJobBoards)) {
      if (config.domains.some((d) => domain.includes(d))) {
        return board;
      }
    }

    return null;
  }

  /**
   * Extract company name from LinkedIn URL
   */
  extractLinkedInCompany(urlString) {
    try {
      // LinkedIn URLs often have format: linkedin.com/jobs/view/... or linkedin.com/jobs/collections/...
      // Company name might be in the URL path or we'd need to scrape
      // For now, return null and let user fill in manually
      const url = new URL(urlString);
      const pathParts = url.pathname.split("/").filter((p) => p);
      
      // Sometimes company name appears in the URL
      // This is a basic extraction - actual implementation would need scraping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract job title from LinkedIn URL
   */
  extractLinkedInTitle(urlString) {
    try {
      const url = new URL(urlString);
      // LinkedIn job titles are often in the URL as encoded strings
      // Basic extraction - would need scraping for accurate results
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract company name from Indeed URL
   */
  extractIndeedCompany(urlString) {
    try {
      const url = new URL(urlString);
      // Indeed URLs: indeed.com/viewjob?jk=...
      // Company info would need scraping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract job title from Indeed URL
   */
  extractIndeedTitle(urlString) {
    try {
      const url = new URL(urlString);
      // Title extraction would need scraping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract company name from Glassdoor URL
   */
  extractGlassdoorCompany(urlString) {
    try {
      const url = new URL(urlString);
      // Glassdoor URLs: glassdoor.com/job-listing/...
      // Company info would need scraping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract job title from Glassdoor URL
   */
  extractGlassdoorTitle(urlString) {
    try {
      const url = new URL(urlString);
      // Title extraction would need scraping
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract company name from company website URL
   */
  extractCompanyFromDomain(urlString) {
    try {
      const domain = this.extractDomain(urlString);
      if (!domain) {
        return null;
      }

      // Skip known job boards - these are not company websites
      const jobBoardDomains = [
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
        "myworkdayjobs.com",
        "boards.greenhouse.io",
        "jobs.lever.co",
      ];

      if (jobBoardDomains.some((board) => domain.includes(board))) {
        return null;
      }

      // Remove common TLDs and extract company name
      const domainParts = domain.split(".");
      if (domainParts.length >= 2) {
        // Take the main domain part (usually second-to-last, but handle subdomains)
        let companyName = domainParts[domainParts.length - 2];
        
        // Handle common prefixes
        const prefixes = ["www", "jobs", "careers", "career", "apply", "recruiting"];
        if (domainParts.length > 2 && prefixes.includes(companyName)) {
          companyName = domainParts[domainParts.length - 3];
        }
        
        // Format company name: capitalize first letter of each word
        const formattedName = companyName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        return formattedName;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Attempt to scrape job posting (basic implementation)
   * Note: Real implementation would require proper web scraping tools
   * For now, this returns null as scraping requires additional setup
   */
  async scrapeJobPosting(urlString) {
    try {
      // In a real implementation, you would use:
      // - Puppeteer/Playwright for dynamic content
      // - Cheerio for static HTML parsing
      // - Or a third-party API service (e.g., RapidAPI job scraping)
      
      // Note: Many job boards block automated scraping or require authentication
      // For production, consider:
      // 1. Using official APIs if available (LinkedIn, Indeed, etc.)
      // 2. Using a third-party service
      // 3. Implementing proper scraping with headless browsers
      
      // For now, return null to indicate scraping is not fully implemented
      // This allows the user to still use the URL and fill in details manually
      return null;
    } catch (error) {
      console.error("Error scraping job posting:", error.message);
      return null;
    }
  }

  /**
   * Import job data from URL
   */
  async importJobFromUrl(urlString) {
    try {
      // Validate URL
      if (!this.validateUrl(urlString)) {
        return {
          success: false,
          error: "Invalid URL format",
          data: null,
        };
      }

      const domain = this.extractDomain(urlString);
      const jobBoard = this.detectJobBoard(urlString);

      // Initialize result object
      const result = {
        url: urlString,
        title: null,
        company: null,
        location: null,
        description: null,
        jobBoard: jobBoard,
        importStatus: "partial", // partial, success, failed
      };

      // Try to extract basic information from URL
      if (jobBoard) {
        const boardConfig = this.supportedJobBoards[jobBoard];
        
        // Try to extract title and company (basic extraction)
        result.title = boardConfig.extractTitle(urlString);
        result.company = boardConfig.extractCompany(urlString);
        
        // Note: Full scraping would be needed for complete data
        // For now, we'll return partial data and let user fill in the rest
        result.importStatus = "partial";
      } else {
        // Not a known job board - try to extract company from domain
        result.company = this.extractCompanyFromDomain(urlString);
        result.importStatus = result.company ? "partial" : "failed";
      }

      // Attempt to scrape if we have partial data
      // This is a placeholder - actual scraping would go here
      // For now, we'll return what we can extract from the URL

      // Determine final status based on what we extracted
      // Even if we don't have title/company, we still have the URL which is useful
      if (result.title && result.company) {
        result.importStatus = "success";
      } else if (result.title || result.company) {
        result.importStatus = "partial";
        result.error = result.company 
          ? "Company name extracted. Please fill in job title and other details."
          : "Some information could not be extracted. Please review and complete all fields.";
      } else {
        // Even if we can't extract data, the URL is valuable
        result.importStatus = "partial";
        result.error = "Unable to automatically extract job details from this URL. The URL has been saved - please fill in the job details manually.";
      }

      // Always return success since we at least have the URL
      return {
        success: true,
        error: result.error || null,
        data: result,
      };
    } catch (error) {
      console.error("Error importing job from URL:", error);
      // Even on error, return the URL so user can still use it
      return {
        success: true,
        error: "Unable to extract job details. You can still add the job manually with the URL.",
        data: {
          url: urlString,
          title: null,
          company: null,
          location: null,
          description: null,
          jobBoard: null,
          importStatus: "partial",
        },
      };
    }
  }

  /**
   * Enhanced import with better extraction (placeholder for future enhancement)
   * This would use proper web scraping libraries or APIs
   */
  async enhancedImportJobFromUrl(urlString) {
    // Placeholder for future implementation with:
    // - Puppeteer/Playwright for dynamic content
    // - Cheerio for HTML parsing
    // - Job board APIs (if available)
    // - Third-party job scraping services
    
    // For now, return basic import
    return this.importJobFromUrl(urlString);
  }
}

export default new JobImportService();

