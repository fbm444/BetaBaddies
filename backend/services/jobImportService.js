import { URL } from "url";
import axios from "axios";
import * as cheerio from "cheerio";

class JobImportService {
  constructor() {
    this.requestTimeout = 15000; // 15 seconds timeout
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    this.supportedJobBoards = {
      linkedin: {
        domains: ["linkedin.com", "www.linkedin.com"],
      },
      indeed: {
        domains: ["indeed.com", "www.indeed.com"],
      },
      glassdoor: {
        domains: ["glassdoor.com", "www.glassdoor.com"],
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
   * Fetch HTML content from URL with proper headers
   */
  async fetchHtml(urlString) {
    try {
      const response = await axios.get(urlString, {
        timeout: this.requestTimeout,
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Cache-Control": "max-age=0",
          "Referer": "https://www.google.com/",
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        decompress: true, // Automatically decompress gzip/deflate
      });

      // Check if we got redirected to login page
      if (response.data && typeof response.data === "string") {
        if (response.data.includes("login") && response.data.includes("linkedin.com/in/uas/login")) {
          console.warn("LinkedIn redirected to login page - job may require authentication");
          // Still try to extract what we can from the page
        }
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching HTML:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        if (error.response.status === 403 || error.response.status === 401) {
          console.warn("Access forbidden - LinkedIn may be blocking the request");
        }
      }
      return null;
    }
  }

  /**
   * Extract JSON-LD structured data from HTML
   */
  extractJsonLd($) {
    try {
      const jsonLdScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < jsonLdScripts.length; i++) {
        try {
          const content = $(jsonLdScripts[i]).html();
          if (content) {
            const data = JSON.parse(content);
            // Check if it's a JobPosting schema
            if (data["@type"] === "JobPosting" || (Array.isArray(data["@type"]) && data["@type"].includes("JobPosting"))) {
              return data;
            }
            // Also check if it's in a graph array
            if (Array.isArray(data["@graph"])) {
              const jobPosting = data["@graph"].find(
                (item) => item["@type"] === "JobPosting" || (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting"))
              );
              if (jobPosting) {
                return jobPosting;
              }
            }
          }
        } catch (parseError) {
          // Continue to next script tag
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Scrape LinkedIn job posting
   */
  async scrapeLinkedInJob(urlString) {
    try {
      const html = await this.fetchHtml(urlString);
      if (!html) {
        return null;
      }

      const $ = cheerio.load(html);
      const result = {
        title: null,
        company: null,
        location: null,
        description: null,
      };

      // Try to extract from JSON-LD structured data first (most reliable)
      const jsonLd = this.extractJsonLd($);
      if (jsonLd) {
        result.title = jsonLd.title || jsonLd.name || null;
        if (jsonLd.hiringOrganization) {
          result.company = jsonLd.hiringOrganization.name || 
                          (typeof jsonLd.hiringOrganization === "string" ? jsonLd.hiringOrganization : null);
        }
        if (jsonLd.jobLocation) {
          if (typeof jsonLd.jobLocation === "string") {
            result.location = jsonLd.jobLocation;
          } else if (jsonLd.jobLocation.address) {
            const addr = jsonLd.jobLocation.address;
            const locationParts = [];
            if (addr.addressLocality) locationParts.push(addr.addressLocality);
            if (addr.addressRegion) locationParts.push(addr.addressRegion);
            if (addr.addressCountry) locationParts.push(addr.addressCountry);
            result.location = locationParts.join(", ");
          }
        }
        if (jsonLd.description) {
          // Clean HTML from description
          result.description = cheerio.load(jsonLd.description).text().trim();
        }
      }

      // Extract from meta tags (fallback)
      if (!result.title) {
        // Try multiple title sources
        const titleSources = [
          $('meta[property="og:title"]').attr("content"),
          $('meta[name="twitter:title"]').attr("content"),
          $('meta[name="title"]').attr("content"),
          $("title").text().trim(),
          $("h1").first().text().trim(),
          $(".jobs-unified-top-card__job-title").text().trim(),
          $(".job-details-jobs-unified-top-card__job-title").text().trim(),
          $(".jobs-details-top-card__job-title").text().trim(),
          $('h1[class*="job-title"]').text().trim(),
        ];

        for (const title of titleSources) {
          if (title && title.length > 0 && title.length < 200) {
            result.title = title;
            break;
          }
        }
      }

      if (!result.company) {
        // Try multiple company sources
        const companySources = [
          $('meta[property="og:description"]').attr("content")?.match(/at\s+([^•|]+)/i)?.[1]?.trim(),
          $(".jobs-unified-top-card__company-name").text().trim(),
          $(".job-details-jobs-unified-top-card__company-name").text().trim(),
          $(".jobs-details-top-card__company-name").text().trim(),
          $('a[class*="company-name"]').text().trim(),
          $('span[class*="company-name"]').text().trim(),
          $('meta[property="og:site_name"]').attr("content"),
        ];

        for (const company of companySources) {
          if (company && company.length > 0 && company.length < 100) {
            result.company = company;
            break;
          }
        }
        
        // Clean up company name if it contains extra text
        if (result.company) {
          result.company = result.company.split("•")[0].trim();
          result.company = result.company.split("|")[0].trim();
          result.company = result.company.split("-")[0].trim();
          result.company = result.company.replace(/^at\s+/i, "");
        }
      }

      if (!result.location) {
        // Try multiple location selectors
        const locationSelectors = [
          ".jobs-unified-top-card__bullet",
          ".job-details-jobs-unified-top-card__primary-description",
          ".jobs-unified-top-card__primary-description",
          ".jobs-unified-top-card__subtitle-primary-grouping",
          ".jobs-details-top-card__job-info-text",
          ".jobs-details-top-card__bullet",
          'span[class*="location"]',
          'div[class*="location"]',
        ];

        for (const selector of locationSelectors) {
          const locationElement = $(selector).first();
          if (locationElement.length > 0) {
            let locationText = locationElement.text().trim();
            // Also try aria-label or data attributes
            if (!locationText || locationText.length === 0) {
              locationText = locationElement.attr("aria-label") || 
                            locationElement.attr("title") ||
                            locationElement.data("location") ||
                            "";
            }
            
            if (locationText && locationText.length > 0 && locationText.length < 100) {
              // Extract location from text (often in format "City, State" or "City, State, Country")
              const locationMatch = locationText.match(/([A-Z][a-zA-Z\s\-]+(?:,\s*[A-Z][a-zA-Z\s\-]+){0,2})/);
              if (locationMatch) {
                result.location = locationMatch[1].trim();
                break;
              }
              // If no match but text looks like a location, use it
              if (locationText.includes(",") || /^[A-Z]/.test(locationText.trim()) || /^Remote/i.test(locationText.trim())) {
                result.location = locationText.split("•")[0].trim();
                result.location = result.location.split("|")[0].trim();
                result.location = result.location.split("\n")[0].trim();
                if (result.location.length > 0 && result.location.length < 100) {
                  break;
                }
              }
            }
          }
        }

        // Also try meta tags and title
        if (!result.location) {
          const metaDesc = $('meta[property="og:description"]').attr("content") || "";
          const title = $("title").text() || "";
          const combinedText = metaDesc + " " + title;
          
          // Look for location patterns
          const locationPatterns = [
            /([A-Z][a-zA-Z\s\-]+,\s*[A-Z][a-zA-Z\s\-]+,\s*[A-Z][a-zA-Z\s\-]+)/, // City, State, Country
            /([A-Z][a-zA-Z\s\-]+,\s*[A-Z][a-zA-Z\s\-]+)/, // City, State
            /(Remote|On-site|Hybrid)/i, // Work type
          ];

          for (const pattern of locationPatterns) {
            const match = combinedText.match(pattern);
            if (match && match[1]) {
              result.location = match[1].trim();
              break;
            }
          }
        }
      }

      if (!result.description) {
        // Try multiple description selectors
        const descriptionSelectors = [
          ".jobs-description-content__text",
          ".jobs-box__html-content",
          ".jobs-description__text",
          ".job-details-jobs-unified-top-card__job-description",
          "#job-details",
          ".jobs-details__main-content",
          ".jobs-description__text--stretch",
          ".jobs-box__html-content--stretch",
          '[id*="job-details"]',
          '[class*="description"]',
          "main article",
          "main .jobs-description",
        ];

        for (const selector of descriptionSelectors) {
          const descElement = $(selector).first();
          if (descElement.length > 0) {
            // Get text content, preserving some structure
            let descText = descElement.text().trim();
            // Also try getting HTML and converting to text
            if (!descText || descText.length < 100) {
              const htmlContent = descElement.html();
              if (htmlContent) {
                // Remove script and style tags
                const $clean = cheerio.load(htmlContent);
                $clean("script, style").remove();
                descText = $clean.text().trim();
              }
            }
            if (descText && descText.length > 100) {
              // Clean up the text
              descText = descText.replace(/\s+/g, " ");
              descText = descText.replace(/\n\s*\n/g, "\n");
              // Limit description length
              result.description = descText.substring(0, 2000);
              break;
            }
          }
        }

        // Fallback: try to get description from meta tags
        if (!result.description) {
          const metaDesc = $('meta[property="og:description"]').attr("content") ||
                          $('meta[name="description"]').attr("content");
          if (metaDesc && metaDesc.length > 100) {
            result.description = metaDesc.substring(0, 2000);
          }
        }

        // Last resort: try to extract from page text
        if (!result.description) {
          const bodyText = $("body").text();
          // Look for common job description indicators
          const descStart = bodyText.search(/(?:job description|about the role|responsibilities|requirements)/i);
          if (descStart > 0 && descStart < 5000) {
            const excerpt = bodyText.substring(descStart, descStart + 2000);
            if (excerpt.length > 100) {
              result.description = excerpt.trim().substring(0, 2000);
            }
          }
        }
      }

      // Clean up extracted data
      if (result.title) {
        result.title = result.title.trim();
        // Remove common suffixes
        result.title = result.title.replace(/\s*-\s*LinkedIn$/, "");
        result.title = result.title.replace(/\s*\|.*$/, "");
      }

      if (result.company) {
        result.company = result.company.trim();
        // Remove common prefixes/suffixes
        result.company = result.company.replace(/^at\s+/i, "");
        result.company = result.company.replace(/\s*•.*$/, "");
        result.company = result.company.replace(/\s*\|.*$/, "");
      }

      if (result.location) {
        result.location = result.location.trim();
        // Clean up location
        result.location = result.location.replace(/\s*•.*$/, "");
        result.location = result.location.replace(/\s*\|.*$/, "");
      }

      if (result.description) {
        result.description = result.description.trim();
        // Remove excessive whitespace
        result.description = result.description.replace(/\n\s*\n\s*\n/g, "\n\n");
      }

      return result;
    } catch (error) {
      console.error("Error scraping LinkedIn job:", error.message);
      return null;
    }
  }

  /**
   * Scrape Indeed job posting (placeholder for future implementation)
   */
  async scrapeIndeedJob(urlString) {
    try {
      const html = await this.fetchHtml(urlString);
      if (!html) {
        return null;
      }

      const $ = cheerio.load(html);
      const result = {
        title: null,
        company: null,
        location: null,
        description: null,
      };

      // Indeed scraping logic would go here
      // For now, return null to indicate not implemented
      return null;
    } catch (error) {
      console.error("Error scraping Indeed job:", error.message);
      return null;
    }
  }

  /**
   * Scrape Glassdoor job posting (placeholder for future implementation)
   */
  async scrapeGlassdoorJob(urlString) {
    try {
      const html = await this.fetchHtml(urlString);
      if (!html) {
        return null;
      }

      const $ = cheerio.load(html);
      const result = {
        title: null,
        company: null,
        location: null,
        description: null,
      };

      // Glassdoor scraping logic would go here
      // For now, return null to indicate not implemented
      return null;
    } catch (error) {
      console.error("Error scraping Glassdoor job:", error.message);
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

      // Scrape job posting based on job board
      let scrapedData = null;
      if (jobBoard === "linkedin") {
        console.log("Scraping LinkedIn job posting:", urlString);
        try {
          scrapedData = await this.scrapeLinkedInJob(urlString);
          if (!scrapedData || (!scrapedData.title && !scrapedData.company)) {
            console.warn("LinkedIn scraping returned limited data - job may require authentication or be dynamically loaded");
          }
        } catch (error) {
          console.error("Error during LinkedIn scraping:", error.message);
          scrapedData = null;
        }
      } else if (jobBoard === "indeed") {
        console.log("Scraping Indeed job posting:", urlString);
        scrapedData = await this.scrapeIndeedJob(urlString);
      } else if (jobBoard === "glassdoor") {
        console.log("Scraping Glassdoor job posting:", urlString);
        scrapedData = await this.scrapeGlassdoorJob(urlString);
      } else {
        // Not a known job board - try to extract company from domain
        result.company = this.extractCompanyFromDomain(urlString);
      }

      // Merge scraped data into result
      if (scrapedData) {
        result.title = scrapedData.title || null;
        result.company = scrapedData.company || result.company || null;
        result.location = scrapedData.location || null;
        result.description = scrapedData.description || null;
      }

      // Determine import status
      if (result.title && result.company) {
        result.importStatus = "success";
        result.error = null;
      } else if (result.title || result.company) {
        result.importStatus = "partial";
        if (result.title && !result.company) {
          result.error = "Job title extracted. Please fill in company name and other details.";
        } else if (result.company && !result.title) {
          result.error = "Company name extracted. Please fill in job title and other details.";
        } else {
          result.error = "Some information could not be extracted. Please review and complete all fields.";
        }
      } else {
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
          jobBoard: jobBoard || null,
          importStatus: "partial",
        },
      };
    }
  }
}

export default new JobImportService();
