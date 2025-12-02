/**
 * Interview Analytics Benchmarks
 * 
 * Industry benchmarks for comparing user performance.
 * Data based on industry research and can be updated over time.
 */

export const interviewBenchmarks = {
  // Overall conversion rate benchmarks
  conversionRate: {
    overall: {
      average: 15.0,      // Average industry conversion rate
      top: 52.0,          // Top performers
      percentile25: 8.0,  // 25th percentile
      percentile50: 15.0, // Median
      percentile75: 25.0, // 75th percentile
      percentile90: 40.0, // 90th percentile
    },
    
    // Conversion rates by interview format
    byFormat: {
      phone_screen: {
        average: 35.0,
        top: 75.0,
        percentile25: 20.0,
        percentile75: 50.0,
      },
      technical: {
        average: 20.0,
        top: 60.0,
        percentile25: 10.0,
        percentile75: 35.0,
      },
      behavioral: {
        average: 25.0,
        top: 70.0,
        percentile25: 15.0,
        percentile75: 40.0,
      },
      on_site: {
        average: 15.0,
        top: 50.0,
        percentile25: 8.0,
        percentile75: 25.0,
      },
      system_design: {
        average: 18.0,
        top: 55.0,
        percentile25: 10.0,
        percentile75: 30.0,
      },
      hirevue: {
        average: 30.0,
        top: 70.0,
        percentile25: 18.0,
        percentile75: 45.0,
      },
    },
    
    // Conversion rates by industry
    byIndustry: {
      "Big Tech": {
        average: 12.0,
        top: 45.0,
        percentile25: 6.0,
        percentile75: 20.0,
      },
      "FinTech": {
        average: 15.0,
        top: 50.0,
        percentile25: 8.0,
        percentile75: 25.0,
      },
      "Startups": {
        average: 20.0,
        top: 60.0,
        percentile25: 12.0,
        percentile75: 35.0,
      },
      "Cloud Services": {
        average: 18.0,
        top: 55.0,
        percentile25: 10.0,
        percentile75: 30.0,
      },
    },
  },
  
  // Skill area performance benchmarks (scores out of 100)
  skillAreaScores: {
    system_design: {
      average: 65.0,
      top: 90.0,
      percentile25: 55.0,
      percentile75: 80.0,
    },
    algorithms: {
      average: 68.0,
      top: 95.0,
      percentile25: 58.0,
      percentile75: 85.0,
    },
    behavioral: {
      average: 70.0,
      top: 95.0,
      percentile25: 60.0,
      percentile75: 85.0,
    },
    apis: {
      average: 72.0,
      top: 92.0,
      percentile25: 62.0,
      percentile75: 85.0,
    },
    time_management: {
      average: 65.0,
      top: 90.0,
      percentile25: 55.0,
      percentile75: 80.0,
    },
  },
  
  // Preparation time benchmarks (in hours)
  preparationTime: {
    phone_screen: {
      optimal: 2,
      range: [1, 5],
      average: 3,
    },
    technical: {
      optimal: 10,
      range: [5, 20],
      average: 12,
    },
    behavioral: {
      optimal: 5,
      range: [3, 10],
      average: 6,
    },
    on_site: {
      optimal: 15,
      range: [10, 30],
      average: 18,
    },
    system_design: {
      optimal: 12,
      range: [8, 25],
      average: 15,
    },
    hirevue: {
      optimal: 4,
      range: [2, 8],
      average: 5,
    },
  },
  
  // Confidence and anxiety benchmarks (0-100 scale)
  confidence: {
    average: 65.0,
    optimal: 75.0,  // Optimal confidence level for best performance
    range: [60, 80], // Healthy range
    low: 50,        // Below this may hurt performance
    high: 85,       // Above this may indicate overconfidence
  },
  
  anxiety: {
    average: 35.0,
    optimal: 25.0,  // Optimal anxiety level (some anxiety is normal)
    range: [20, 40], // Healthy range
    low: 10,        // Very low anxiety
    high: 60,       // High anxiety that may impact performance
  },
};

/**
 * Get benchmark for a specific metric
 * @param {string} category - 'conversionRate', 'skillAreaScores', etc.
 * @param {string} subcategory - Format, industry, or skill area
 * @returns {Object} Benchmark data
 */
export function getBenchmark(category, subcategory = null) {
  if (!interviewBenchmarks[category]) {
    return null;
  }
  
  if (subcategory) {
    // Check if subcategory exists in category
    if (interviewBenchmarks[category][subcategory]) {
      return interviewBenchmarks[category][subcategory];
    }
  }
  
  // Return overall for category
  if (interviewBenchmarks[category].overall) {
    return interviewBenchmarks[category].overall;
  }
  
  return interviewBenchmarks[category];
}

/**
 * Calculate percentile ranking for a value
 * @param {number} value - User's value
 * @param {Object} benchmark - Benchmark object with percentile values
 * @returns {number} Percentile (0-100)
 */
export function calculatePercentile(value, benchmark) {
  if (!benchmark || typeof value !== 'number') {
    return null;
  }
  
  // Simple percentile calculation based on benchmark data
  if (value >= benchmark.percentile90) return 90;
  if (value >= benchmark.percentile75) return 75;
  if (value >= benchmark.percentile50 || value >= benchmark.average) return 50;
  if (value >= benchmark.percentile25) return 25;
  return 10;
}

export default interviewBenchmarks;

