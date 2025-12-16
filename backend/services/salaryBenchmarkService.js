import database from "./database.js";
import axios from "axios";
import { wrapApiCall } from "../utils/apiCallWrapper.js";
import salaryMarketResearchService from "./salaryMarketResearchService.js";
import dotenv from "dotenv";

dotenv.config();

class SalaryBenchmarkService {
  constructor() {
    this.blsApiUrl = process.env.BLS_API_URL || "https://api.bls.gov/publicAPI/v2";
    this.blsApiKey = process.env.BLS_API_KEY || null;
    this.cacheTtlDays = parseInt(process.env.SALARY_BENCHMARK_CACHE_TTL_DAYS || "7", 10);
    
    // Job title to BLS SOC code mapping (common tech roles)
    // BLS uses Standard Occupational Classification codes
    // Note: If a job title doesn't match, the service will use AI fallback
    this.jobTitleToSocMapping = {
      "software engineer": "15113200",
      "software developer": "15113200",
      "software development engineer": "15113200",
      "data scientist": "15204100",
      "data analyst": "15204100",
      "data engineer": "15113200",
      "product manager": "11302100",
      "project manager": "11302100",
      "product designer": "27102400",
      "ui designer": "27102400",
      "ux designer": "27102400",
      "devops engineer": "15113200",
      "systems administrator": "15114200",
      "network administrator": "15114200",
      "database administrator": "15114200",
      "security engineer": "15113200",
      "machine learning engineer": "15113200",
      "frontend developer": "15113200",
      "backend developer": "15113200",
      "full stack developer": "15113200",
      "mobile developer": "15113200",
      "web developer": "15113200",
      // Additional common titles
      "engineer": "15113200",
      "developer": "15113200",
      "programmer": "15113200",
      "analyst": "15204100",
      "scientist": "15204100",
      "manager": "11302100",
      "designer": "27102400",
      "administrator": "15114200",
    };
  }

  /**
   * Normalize job title for consistent lookups
   */
  normalizeJobTitle(jobTitle) {
    if (!jobTitle) return null;
    return jobTitle.toLowerCase().trim();
  }

  /**
   * Normalize location string
   */
  normalizeLocation(location) {
    if (!location) return null;
    // Handle "Remote" variations
    const remoteVariations = ["remote", "work from home", "wfh", "anywhere"];
    const normalized = location.toLowerCase().trim();
    
    if (remoteVariations.some(v => normalized.includes(v))) {
      return "Remote";
    }
    
    // Return normalized location (e.g., "San Francisco, CA" -> "san francisco, ca")
    return normalized;
  }

  /**
   * Extract state code from location string
   */
  extractStateCode(location) {
    if (!location) return null;
    
    const normalized = location.toLowerCase().trim();
    if (normalized === "remote") return null;
    
    // US state codes
    const stateCodes = {
      "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
      "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
      "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
      "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
      "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
      "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
      "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
      "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
      "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
      "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
      "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
      "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
      "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"
    };
    
    // Try to find state code in location string
    for (const [stateName, code] of Object.entries(stateCodes)) {
      if (normalized.includes(stateName) || normalized.endsWith(`, ${code.toLowerCase()}`) || 
          normalized.endsWith(` ${code.toLowerCase()}`)) {
        return code;
      }
    }
    
    // Try to extract 2-letter code at the end
    const match = normalized.match(/\b([a-z]{2})\b$/);
    if (match && Object.values(stateCodes).includes(match[1].toUpperCase())) {
      return match[1].toUpperCase();
    }
    
    return null;
  }

  /**
   * Get BLS SOC code for a job title
   * Tries exact match first, then partial matches
   */
  getSocCodeForJobTitle(jobTitle) {
    const normalized = this.normalizeJobTitle(jobTitle);
    if (!normalized) return null;
    
    // Try exact match first
    if (this.jobTitleToSocMapping[normalized]) {
      return this.jobTitleToSocMapping[normalized];
    }
    
    // Try partial matches (e.g., "senior software engineer" -> "software engineer")
    for (const [key, code] of Object.entries(this.jobTitleToSocMapping)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return code;
      }
    }
    
    return null;
  }

  /**
   * Check if cached data exists and is still valid
   */
  async getCachedBenchmark(jobTitle, location) {
    try {
      const normalizedTitle = this.normalizeJobTitle(jobTitle);
      const normalizedLocation = this.normalizeLocation(location);
      
      const query = `
        SELECT 
          percentile_25,
          percentile_50,
          percentile_75,
          source,
          data_year,
          last_updated,
          expires_at
        FROM salary_benchmarks
        WHERE LOWER(job_title) = $1
          AND LOWER(location) = $2
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY last_updated DESC
        LIMIT 1
      `;
      
      const result = await database.query(query, [normalizedTitle, normalizedLocation]);
      
      if (result.rows.length > 0) {
        return {
          percentile25: parseFloat(result.rows[0].percentile_25),
          percentile50: parseFloat(result.rows[0].percentile_50),
          percentile75: parseFloat(result.rows[0].percentile_75),
          source: result.rows[0].source,
          dataYear: result.rows[0].data_year,
          lastUpdated: result.rows[0].last_updated,
          cached: true
        };
      }
      
      return null;
    } catch (error) {
      console.error("❌ Error getting cached benchmark:", error);
      return null;
    }
  }

  /**
   * Cache salary benchmark data
   */
  async cacheBenchmark(jobTitle, location, benchmarkData) {
    try {
      const normalizedTitle = this.normalizeJobTitle(jobTitle);
      const normalizedLocation = this.normalizeLocation(location);
      const stateCode = this.extractStateCode(location);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.cacheTtlDays);
      
      const query = `
        INSERT INTO salary_benchmarks (
          job_title,
          location,
          state_code,
          percentile_25,
          percentile_50,
          percentile_75,
          source,
          data_year,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (job_title, location)
        DO UPDATE SET
          percentile_25 = EXCLUDED.percentile_25,
          percentile_50 = EXCLUDED.percentile_50,
          percentile_75 = EXCLUDED.percentile_75,
          source = EXCLUDED.source,
          data_year = EXCLUDED.data_year,
          last_updated = CURRENT_TIMESTAMP,
          expires_at = EXCLUDED.expires_at
      `;
      
      await database.query(query, [
        normalizedTitle,
        normalizedLocation,
        stateCode,
        benchmarkData.percentile25,
        benchmarkData.percentile50,
        benchmarkData.percentile75,
        benchmarkData.source || "bls",
        benchmarkData.dataYear || new Date().getFullYear(),
        expiresAt
      ]);
      
      console.log(`✅ Cached salary benchmark for ${normalizedTitle} in ${normalizedLocation}`);
    } catch (error) {
      console.error("❌ Error caching benchmark:", error);
      // Don't throw - caching failure shouldn't break the API call
    }
  }

  /**
   * Fetch salary data from BLS API
   */
  async fetchFromBlsApi(jobTitle, location) {
    const socCode = this.getSocCodeForJobTitle(jobTitle);
    if (!socCode) {
      throw new Error(`No BLS SOC code mapping found for job title: ${jobTitle}`);
    }

    const stateCode = this.extractStateCode(location);
    if (!stateCode) {
      // For remote or unknown locations, use national data
      return await this.fetchNationalBlsData(socCode);
    }

    // Try state-specific data first, fallback to national
    try {
      return await this.fetchStateBlsData(socCode, stateCode);
    } catch (error) {
      console.log(`⚠️ State data not available, falling back to national data: ${error.message}`);
      return await this.fetchNationalBlsData(socCode);
    }
  }

  /**
   * Fetch national BLS data (fallback when state data unavailable)
   * Uses percentile series IDs: 02=25th, 03=50th, 04=75th
   */
  async fetchNationalBlsData(socCode) {
    // BLS percentile series IDs:
    // 02 = 25th percentile, 03 = 50th percentile (median), 04 = 75th percentile
    const seriesIds = [
      `OEUN0000000000000${socCode}02`, // 25th percentile
      `OEUN0000000000000${socCode}03`, // 50th percentile (median)
      `OEUN0000000000000${socCode}04`, // 75th percentile
    ];
    
    return await wrapApiCall({
      serviceName: "bls",
      endpoint: "timeseries_data",
      apiCall: async () => {
        const requestBody = {
          seriesid: seriesIds,
          startyear: new Date().getFullYear() - 1,
          endyear: new Date().getFullYear(),
        };

        if (this.blsApiKey) {
          requestBody.registrationkey = this.blsApiKey;
        }

        const response = await axios.post(
          `${this.blsApiUrl}/timeseries/data/`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        if (response.data.status !== "REQUEST_SUCCEEDED") {
          throw new Error(`BLS API error: ${response.data.message || "Unknown error"}`);
        }

        return this.parseBlsResponse(response.data, seriesIds);
      },
    });
  }

  /**
   * Fetch state-specific BLS data
   * Uses percentile series IDs: 02=25th, 03=50th, 04=75th
   */
  async fetchStateBlsData(socCode, stateCode) {
    // BLS state series format: OEUS[STATE_CODE]0000000000000[SOC_CODE][PERCENTILE]
    // State codes are numeric: CA=06, NY=36, TX=48, etc.
    const stateNumericCodes = {
      "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08",
      "CT": "09", "DE": "10", "FL": "12", "GA": "13", "HI": "15", "ID": "16",
      "IL": "17", "IN": "18", "IA": "19", "KS": "20", "KY": "21", "LA": "22",
      "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27", "MS": "28",
      "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33", "NJ": "34",
      "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39", "OK": "40",
      "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46", "TN": "47",
      "TX": "48", "UT": "49", "VT": "50", "VA": "51", "WA": "53", "WV": "54",
      "WI": "55", "WY": "56", "DC": "11"
    };

    const stateNumeric = stateNumericCodes[stateCode];
    if (!stateNumeric) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    // BLS percentile series IDs: 02=25th, 03=50th, 04=75th
    const seriesIds = [
      `OEUS${stateNumeric}0000000000000${socCode}02`, // 25th percentile
      `OEUS${stateNumeric}0000000000000${socCode}03`, // 50th percentile (median)
      `OEUS${stateNumeric}0000000000000${socCode}04`, // 75th percentile
    ];

    return await wrapApiCall({
      serviceName: "bls",
      endpoint: "timeseries_data_state",
      apiCall: async () => {
        const requestBody = {
          seriesid: seriesIds,
          startyear: new Date().getFullYear() - 1,
          endyear: new Date().getFullYear(),
        };

        if (this.blsApiKey) {
          requestBody.registrationkey = this.blsApiKey;
        }

        const response = await axios.post(
          `${this.blsApiUrl}/timeseries/data/`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );

        if (response.data.status !== "REQUEST_SUCCEEDED") {
          throw new Error(`BLS API error: ${response.data.message || "Unknown error"}`);
        }

        return this.parseBlsResponse(response.data, seriesIds);
      },
    });
  }

  /**
   * Parse BLS API response and extract percentile data
   * Expects 3 series: 25th percentile, 50th percentile (median), 75th percentile
   */
  parseBlsResponse(blsData, seriesIds = []) {
    if (!blsData.Results || !blsData.Results.series || blsData.Results.series.length === 0) {
      throw new Error("No data in BLS response");
    }

    const series = blsData.Results.series;
    
    // Extract percentile values from each series
    // Series order should be: 25th, 50th, 75th (matching seriesIds order)
    let percentile25 = null;
    let percentile50 = null;
    let percentile75 = null;
    let dataYear = new Date().getFullYear();

    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const data = s.data || [];
      
      if (data.length === 0) continue;
      
      // Get most recent year's data (BLS returns in reverse chronological order)
      const latestData = data[0];
      const value = latestData.value ? parseFloat(latestData.value) : null;
      
      // Determine which percentile this series represents based on series ID
      // Series IDs end with: 02=25th, 03=50th, 04=75th
      const seriesId = s.seriesID || (seriesIds[i] || "");
      
      if (seriesId.endsWith("02") || i === 0) {
        // 25th percentile
        percentile25 = value;
      } else if (seriesId.endsWith("03") || i === 1) {
        // 50th percentile (median)
        percentile50 = value;
      } else if (seriesId.endsWith("04") || i === 2) {
        // 75th percentile
        percentile75 = value;
      }
      
      // Use the year from any series (they should all be the same)
      if (latestData.year) {
        dataYear = parseInt(latestData.year);
      }
    }

    // Validate we have all required percentiles
    if (percentile25 === null || percentile50 === null || percentile75 === null) {
      throw new Error("Missing percentile data in BLS response");
    }

    return {
      percentile25,
      percentile50,
      percentile75,
      dataYear,
      source: "bls"
    };
  }

  /**
   * Generate fallback salary estimates using AI or simple calculations
   */
  async generateFallbackEstimate(jobTitle, location) {
    try {
      console.log(`🔄 Generating fallback salary estimate for ${jobTitle} in ${location}`);
      
      // Try AI-based market research first
      try {
        const marketData = await salaryMarketResearchService.researchMarketSalary(
          jobTitle,
          location,
          3, // Default to 3 years experience if not specified
          null // No specific industry
        );
        
        if (marketData && marketData.percentile50) {
          return {
            percentile25: marketData.percentile25,
            percentile50: marketData.percentile50,
            percentile75: marketData.percentile75,
            source: marketData.source || "AI-generated estimate",
            dataYear: new Date().getFullYear(),
            lastUpdated: new Date().toISOString(),
            cached: false
          };
        }
      } catch (aiError) {
        console.log(`⚠️ AI fallback failed, using simple estimate: ${aiError.message}`);
      }
      
      // Simple fallback based on job title keywords
      const normalizedTitle = this.normalizeJobTitle(jobTitle);
      let baseSalary = 70000; // Default base
      
      // Adjust based on common role keywords
      if (normalizedTitle.includes("senior") || normalizedTitle.includes("lead") || normalizedTitle.includes("principal")) {
        baseSalary = 120000;
      } else if (normalizedTitle.includes("junior") || normalizedTitle.includes("entry") || normalizedTitle.includes("associate")) {
        baseSalary = 55000;
      } else if (normalizedTitle.includes("manager") || normalizedTitle.includes("director")) {
        baseSalary = 130000;
      } else if (normalizedTitle.includes("engineer") || normalizedTitle.includes("developer") || normalizedTitle.includes("programmer")) {
        baseSalary = 95000;
      } else if (normalizedTitle.includes("analyst")) {
        baseSalary = 65000;
      } else if (normalizedTitle.includes("scientist") || normalizedTitle.includes("researcher")) {
        baseSalary = 110000;
      }
      
      // Adjust for high-cost locations
      const normalizedLocation = this.normalizeLocation(location);
      const highCostLocations = ["san francisco", "new york", "seattle", "boston", "los angeles", "washington", "dc"];
      if (highCostLocations.some(loc => normalizedLocation.includes(loc))) {
        baseSalary = Math.round(baseSalary * 1.3);
      }
      
      return {
        percentile25: Math.round(baseSalary * 0.75),
        percentile50: baseSalary,
        percentile75: Math.round(baseSalary * 1.35),
        source: "Estimated based on role and location",
        dataYear: new Date().getFullYear(),
        lastUpdated: new Date().toISOString(),
        cached: false
      };
    } catch (error) {
      console.error("❌ Error generating fallback estimate:", error);
      return null;
    }
  }

  /**
   * Get salary benchmark for a job title and location
   * Checks cache first, then fetches from API if needed
   * Falls back to AI-generated estimates if BLS data unavailable
   */
  async getSalaryBenchmark(jobTitle, location) {
    try {
      // Check cache first
      const cached = await this.getCachedBenchmark(jobTitle, location);
      if (cached) {
        console.log(`✅ Using cached salary benchmark for ${jobTitle} in ${location}`);
        return cached;
      }

      // If not cached or expired, try BLS API first
      console.log(`📡 Fetching salary benchmark from BLS API for ${jobTitle} in ${location}`);
      
      try {
        const benchmarkData = await this.fetchFromBlsApi(jobTitle, location);
        
        // Cache the result
        await this.cacheBenchmark(jobTitle, location, benchmarkData);
        
        return {
          ...benchmarkData,
          cached: false
        };
      } catch (apiError) {
        console.log(`⚠️ BLS API not available (${apiError.message}), trying fallback estimate...`);
        
        // Fallback to AI-generated or estimated data
        const fallbackData = await this.generateFallbackEstimate(jobTitle, location);
        
        if (fallbackData) {
          // Cache the fallback estimate (with shorter TTL)
          try {
            await this.cacheBenchmark(jobTitle, location, fallbackData);
          } catch (cacheError) {
            console.warn("⚠️ Failed to cache fallback estimate:", cacheError.message);
          }
          
          return fallbackData;
        }
        
        // If all else fails, return null
        return null;
      }
    } catch (error) {
      console.error("❌ Error in getSalaryBenchmark:", error);
      
      // Last resort: try fallback
      try {
        return await this.generateFallbackEstimate(jobTitle, location);
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
        return null;
      }
    }
  }
}

export default new SalaryBenchmarkService();

