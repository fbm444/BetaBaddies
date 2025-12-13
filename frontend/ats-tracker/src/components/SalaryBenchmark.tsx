import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import type { SalaryBenchmarkData } from "../types";

interface SalaryBenchmarkProps {
  jobTitle: string;
  location: string;
  jobSalaryMin?: number;
  jobSalaryMax?: number;
}

export function SalaryBenchmark({
  jobTitle,
  location,
  jobSalaryMin,
  jobSalaryMax,
}: SalaryBenchmarkProps) {
  const [benchmark, setBenchmark] = useState<SalaryBenchmarkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobTitle || !location) return;

    const fetchBenchmark = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getSalaryBenchmark(jobTitle, location);
        if (response.ok && response.data?.benchmark) {
          setBenchmark(response.data.benchmark);
        } else {
          setError(response.data?.message || "Salary data not available");
        }
      } catch (err: any) {
        console.error("Error fetching salary benchmark:", err);
        setError("Failed to load salary benchmark data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBenchmark();
  }, [jobTitle, location]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSalaryComparison = () => {
    if (!benchmark || (!jobSalaryMin && !jobSalaryMax)) return null;

    const jobMidpoint = jobSalaryMin && jobSalaryMax
      ? (jobSalaryMin + jobSalaryMax) / 2
      : jobSalaryMin || jobSalaryMax || 0;

    if (jobMidpoint < benchmark.percentile25) {
      return { level: "below_25", message: "Below 25th percentile" };
    } else if (jobMidpoint < benchmark.percentile50) {
      return { level: "25_50", message: "Between 25th and 50th percentile" };
    } else if (jobMidpoint <= benchmark.percentile75) {
      return { level: "50_75", message: "Between 50th and 75th percentile" };
    } else {
      return { level: "above_75", message: "Above 75th percentile" };
    }
  };

  const comparison = getSalaryComparison();

  if (isLoading) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-600">
          <Icon icon="mingcute:loading-line" className="animate-spin" width={20} />
          <span className="text-sm">Loading salary benchmarks...</span>
        </div>
      </div>
    );
  }

  if (error || !benchmark) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-start gap-2">
          <Icon icon="mingcute:information-line" className="text-slate-400 mt-0.5" width={20} />
          <div className="flex-1">
            <p className="text-sm text-slate-600">
              {error || "Salary benchmark data not available for this position and location"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">Salary Benchmarks</h4>
        {benchmark.cached && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Icon icon="mingcute:time-line" width={14} />
            Cached
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">25th Percentile</div>
          <div className="text-lg font-semibold text-slate-900">
            {formatCurrency(benchmark.percentile25)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200 border-blue-300">
          <div className="text-xs text-slate-500 mb-1">50th Percentile (Median)</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(benchmark.percentile50)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">75th Percentile</div>
          <div className="text-lg font-semibold text-slate-900">
            {formatCurrency(benchmark.percentile75)}
          </div>
        </div>
      </div>

      {comparison && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Icon
              icon={
                comparison.level === "above_75"
                  ? "mingcute:arrow-up-line"
                  : comparison.level === "below_25"
                  ? "mingcute:arrow-down-line"
                  : "mingcute:arrow-right-line"
              }
              className={
                comparison.level === "above_75"
                  ? "text-green-600"
                  : comparison.level === "below_25"
                  ? "text-red-600"
                  : "text-blue-600"
              }
              width={16}
            />
            <span className="text-xs text-slate-600">
              Job salary range: {comparison.message}
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex items-start gap-2">
          <Icon icon="mingcute:information-line" className="text-slate-400 mt-0.5" width={14} />
          <div className="flex-1">
            <p className="text-xs text-slate-500 leading-relaxed">
              Data source: {benchmark.source === "bls" ? "US Bureau of Labor Statistics" : benchmark.source}
              {benchmark.dataYear && ` (${benchmark.dataYear})`}
              {benchmark.lastUpdated && (
                <span className="block mt-1">
                  Last updated: {new Date(benchmark.lastUpdated).toLocaleDateString()}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1 italic">
              Salary data is provided for informational purposes only. Actual salaries may vary based on experience, company size, and other factors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

