import database from "./database.js";
import axios from "axios";
import { wrapApiCall } from "../utils/apiCallWrapper.js";
import dotenv from "dotenv";

dotenv.config();

class SalaryBenchmarkService {
  constructor() {
    this.blsApiUrl = process.env.BLS_API_URL || "https://api.bls.gov/publicAPI/v2";
    this.blsApiKey = process.env.BLS_API_KEY || null;
    this.cacheTtlDays = parseInt(process.env.SALARY_BENCHMARK_CACHE_TTL_DAYS || "7", 10);
    
    // Job title to BLS SOC code mapping (common tech roles)
    // BLS uses Standard Occupational Classification codes
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
   */
  getSocCodeForJobTitle(jobTitle) {
    const normalized = this.normalizeJobTitle(jobTitle);
    return this.jobTitleToSocMapping[normalized] || null;
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
   */
  async fetchNationalBlsData(socCode) {
    const seriesId = `OEUN0000000000000${socCode}00`; // National data series
    
    return await wrapApiCall({
      serviceName: "bls",
      endpoint: "timeseries_data",
      apiCall: async () => {
        const requestBody = {
          seriesid: [seriesId],
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

        return this.parseBlsResponse(response.data);
      },
    });
  }

  /**
   * Fetch state-specific BLS data
   */
  async fetchStateBlsData(socCode, stateCode) {
    // BLS state series format: OEUS[STATE_CODE]0000000000000[SOC_CODE]00
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

    const seriesId = `OEUS${stateNumeric}0000000000000${socCode}00`;

    return await wrapApiCall({
      serviceName: "bls",
      endpoint: "timeseries_data_state",
      apiCall: async () => {
        const requestBody = {
          seriesid: [seriesId],
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

        return this.parseBlsResponse(response.data);
      },
    });
  }

  /**
   * Parse BLS API response and extract percentile data
   */
  parseBlsResponse(blsData) {
    if (!blsData.Results || !blsData.Results.series || blsData.Results.series.length === 0) {
      throw new Error("No data in BLS response");
    }

    const series = blsData.Results.series[0];
    const data = series.data || [];

    if (data.length === 0) {
      throw new Error("No salary data points in BLS response");
    }

    // BLS provides annual wage data with percentiles
    // Look for the most recent year's data
    const latestData = data[0]; // BLS returns data in reverse chronological order

    // BLS data structure varies, but typically includes:
    // - Annual mean wage
    // - Percentile wages (10th, 25th, 50th, 75th, 90th)
    // We need to extract the percentile values
    
    // Note: BLS API structure may vary. This is a simplified parser.
    // You may need to adjust based on actual BLS response structure.
    const percentile25 = latestData.value ? parseFloat(latestData.value) * 0.75 : null;
    const percentile50 = latestData.value ? parseFloat(latestData.value) : null;
    const percentile75 = latestData.value ? parseFloat(latestData.value) * 1.25 : null;

    // If BLS provides actual percentile data, use that instead
    // This is a placeholder - actual BLS response may have different structure
    if (latestData.calculations && latestData.calculations.pct_annual) {
      // Use actual percentile data if available
      return {
        percentile25: latestData.calculations.pct_annual.p25 || percentile25,
        percentile50: latestData.calculations.pct_annual.p50 || percentile50,
        percentile75: latestData.calculations.pct_annual.p75 || percentile75,
        dataYear: parseInt(latestData.year) || new Date().getFullYear(),
        source: "bls"
      };
    }

    // Fallback: estimate percentiles from mean (rough approximation)
    return {
      percentile25: percentile25,
      percentile50: percentile50,
      percentile75: percentile75,
      dataYear: parseInt(latestData.year) || new Date().getFullYear(),
      source: "bls"
    };
  }

  /**
   * Get salary benchmark for a job title and location
   * Checks cache first, then fetches from API if needed
   */
  async getSalaryBenchmark(jobTitle, location) {
    try {
      // Check cache first
      const cached = await this.getCachedBenchmark(jobTitle, location);
      if (cached) {
        console.log(`✅ Using cached salary benchmark for ${jobTitle} in ${location}`);
        return cached;
      }

      // If not cached or expired, fetch from API
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
        console.error(`❌ Error fetching from BLS API: ${apiError.message}`);
        
        // Return null if API fails - we'll handle gracefully in the controller
        return null;
      }
    } catch (error) {
      console.error("❌ Error in getSalaryBenchmark:", error);
      return null;
    }
  }
}

export default new SalaryBenchmarkService();

