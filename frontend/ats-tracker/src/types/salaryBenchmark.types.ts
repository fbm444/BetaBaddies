/**
 * Salary Benchmark Types
 * Types for salary benchmark data from BLS and other sources
 */

export type SalaryBenchmarkSource = 'bls' | 'glassdoor' | 'combined';

export interface SalaryBenchmarkData {
  /** 25th percentile salary (25% of workers earn less than this) */
  percentile25: number;
  /** 50th percentile salary (median - 50% of workers earn less than this) */
  percentile50: number;
  /** 75th percentile salary (75% of workers earn less than this) */
  percentile75: number;
  /** Data source */
  source: SalaryBenchmarkSource;
  /** Year the data represents */
  dataYear: number;
  /** When the data was last updated */
  lastUpdated: string;
  /** Whether this data was served from cache */
  cached: boolean;
}

export interface SalaryBenchmarkResponse {
  benchmark: SalaryBenchmarkData | null;
  message?: string;
}

