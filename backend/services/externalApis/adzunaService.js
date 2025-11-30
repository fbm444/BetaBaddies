import axios from 'axios';

/**
 * Adzuna API Service
 * Provides real-time job market data including salaries, trends, and skill demand
 * API Documentation: https://developer.adzuna.com/
 */
class AdzunaService {
  constructor() {
    this.appId = process.env.ADZUNA_APP_ID;
    this.apiKey = process.env.ADZUNA_API_KEY;
    this.baseUrl = 'https://api.adzuna.com/v1/api/jobs/us';
    
    if (!this.appId || !this.apiKey) {
      console.warn('⚠️ Adzuna API credentials not configured');
    }
  }

  /**
   * Get salary estimate for a job title
   * Uses the search API to get mean salary from real job postings
   */
  async getSalaryEstimate(jobTitle, skills = [], location = null) {
    if (!this.appId || !this.apiKey) {
      console.warn('⚠️ Adzuna API not configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        app_id: this.appId,
        app_key: this.apiKey,
        what: jobTitle,
        results_per_page: '1' // Only need the mean, not full results
      });

      // Add location if provided (use 'where' param, not location0/location1)
      if (location) {
        params.append('where', location);
      }

      const url = `${this.baseUrl}/search/1?${params.toString()}`;
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      // The search API returns a 'mean' salary across all matching jobs
      if (response.data && response.data.mean) {
        return {
          median: Math.round(response.data.mean),
          currency: 'USD',
          jobTitle,
          location: location || 'US',
          count: response.data.count || 0,
          source: 'Adzuna'
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Adzuna Salary API error:', error.message);
      return null;
    }
  }

  /**
   * Get salary distribution histogram for a job title/location
   * Returns actual salary ranges and job counts
   */
  async getSalaryHistogram(jobTitle, location = null) {
    if (!this.appId || !this.apiKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        app_id: this.appId,
        app_key: this.apiKey,
        what: jobTitle,
        'content-type': 'application/json'
      });

      // Add location filters if provided
      if (location) {
        params.append('where', location);
      }

      const url = `${this.baseUrl}/histogram?${params.toString()}`;
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      if (response.data && response.data.histogram) {
        return this.parseSalaryHistogram(response.data.histogram);
      }

      return null;
    } catch (error) {
      console.error('❌ Adzuna Histogram API error:', error.message);
      return null;
    }
  }

  /**
   * Parse Adzuna histogram into percentile distribution
   * Histogram buckets represent salary ranges, not exact values
   */
  parseSalaryHistogram(histogram) {
    if (!histogram || Object.keys(histogram).length === 0) {
      return null;
    }

    // Histogram is an object like: { "20000": 5, "40000": 12, "60000": 8, ... }
    // Keys are the START of salary buckets, values are job counts in that bucket
    
    // Sort buckets by salary
    const buckets = Object.entries(histogram)
      .map(([salary, count]) => ({ salary: parseInt(salary), count: parseInt(count) }))
      .filter(b => b.count > 0)
      .sort((a, b) => a.salary - b.salary);

    if (buckets.length === 0) {
      return null;
    }

    // Calculate bucket ranges (each bucket goes from its value to the next bucket's value)
    const bucketRanges = buckets.map((bucket, i) => {
      const start = bucket.salary;
      const end = i < buckets.length - 1 ? buckets[i + 1].salary : bucket.salary * 1.2; // Last bucket +20%
      const midpoint = (start + end) / 2;
      return { midpoint, count: bucket.count };
    });

    // Build distribution using bucket midpoints
    const salaries = [];
    for (const bucket of bucketRanges) {
      for (let i = 0; i < bucket.count; i++) {
        salaries.push(bucket.midpoint);
      }
    }

    salaries.sort((a, b) => a - b);

    const getPercentile = (arr, p) => {
      const index = Math.floor((arr.length - 1) * (p / 100));
      return Math.round(arr[index]);
    };

    const totalJobs = salaries.length;

    return {
      p10: getPercentile(salaries, 10),
      p25: getPercentile(salaries, 25),
      median: getPercentile(salaries, 50),
      p75: getPercentile(salaries, 75),
      p90: getPercentile(salaries, 90),
      sampleSize: totalJobs,
      source: 'Adzuna market data'
    };
  }

  /**
   * Get skill demand by searching for jobs mentioning specific skills
   * Returns job count for each skill
   */
  async getSkillDemand(skills, location = null, daysBack = 30) {
    if (!this.appId || !this.apiKey || !skills || skills.length === 0) {
      return [];
    }

    const skillDemand = [];

    try {
      // Search for each skill (limited to avoid rate limits)
      for (const skill of skills.slice(0, 10)) { // Limit to 10 skills to conserve API calls
        const params = new URLSearchParams({
          app_id: this.appId,
          app_key: this.apiKey,
          what: skill,
          results_per_page: '1', // We only want the count
          max_days_old: daysBack.toString()
        });

        if (location) {
          params.append('where', location);
        }

        const url = `${this.baseUrl}/search/1?${params.toString()}`;
        
        const response = await axios.get(url, {
          timeout: 10000
        });

        if (response.data && response.data.count !== undefined) {
          skillDemand.push({
            skillName: skill,
            demandCount: response.data.count,
            timeframe: `${daysBack} days`,
            location: location || 'US'
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return skillDemand.sort((a, b) => b.demandCount - a.demandCount);
    } catch (error) {
      console.error('❌ Adzuna Skill Demand error:', error.message);
      return [];
    }
  }

  /**
   * Get industry job posting trends
   * Returns job counts and growth metrics for an industry/category
   */
  async getIndustryTrends(jobCategory, location = null) {
    if (!this.appId || !this.apiKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        app_id: this.appId,
        app_key: this.apiKey,
        what: jobCategory,
        results_per_page: '1'
      });

      if (location) {
        params.append('where', location);
      }

      // Get current month data
      params.append('max_days_old', '30');
      const currentUrl = `${this.baseUrl}/search/1?${params.toString()}`;
      const currentResponse = await axios.get(currentUrl, { timeout: 10000 });

      // Get previous month data for comparison
      params.set('max_days_old', '60');
      const previousUrl = `${this.baseUrl}/search/1?${params.toString()}`;
      const previousResponse = await axios.get(previousUrl, { timeout: 10000 });

      const currentCount = currentResponse.data?.count || 0;
      const previousCount = previousResponse.data?.count || 0;
      
      // Previous count includes current, so subtract to get actual previous period
      const actualPreviousCount = previousCount - currentCount;
      
      const growthRate = actualPreviousCount > 0
        ? ((currentCount - actualPreviousCount) / actualPreviousCount * 100).toFixed(2)
        : 0;

      return {
        recentJobs: currentCount,
        previousPeriodJobs: actualPreviousCount,
        growthRate: parseFloat(growthRate),
        trend: growthRate > 10 ? 'strong_growth' :
               growthRate > 0 ? 'growing' :
               growthRate < -10 ? 'declining' : 'stable',
        timeframe: '30 days',
        source: 'Adzuna'
      };
    } catch (error) {
      console.error('❌ Adzuna Industry Trends error:', error.message);
      return null;
    }
  }

  /**
   * Get top hiring companies for a job category/title
   */
  async getTopCompanies(jobCategory, location = null, limit = 10) {
    if (!this.appId || !this.apiKey) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        app_id: this.appId,
        app_key: this.apiKey,
        what: jobCategory,
        'content-type': 'application/json'
      });

      if (location) {
        params.append('where', location);
      }

      const url = `${this.baseUrl}/top_companies?${params.toString()}`;
      
      const response = await axios.get(url, {
        timeout: 10000
      });

      if (response.data && response.data.leaderboard) {
        return response.data.leaderboard.slice(0, limit).map(company => ({
          company: company.canonical_name || company.name,
          jobCount: company.count || 0
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ Adzuna Top Companies error:', error.message);
      return [];
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured() {
    return !!(this.appId && this.apiKey);
  }
}

export default new AdzunaService();

