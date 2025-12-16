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
            <p className="text-sm font-medium text-slate-700 mb-1">
              Salary Benchmark Data
            </p>
            <p className="text-sm text-slate-600">
              {error || "Benchmark data is not currently available for this position and location. This may be because the job title doesn't match standard classifications or the location data isn't available in our database."}
            </p>
            <p className="text-xs text-slate-500 mt-2 italic">
              You can still use market research tools or salary negotiation features to get compensation insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 rounded-xl p-6 border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
            <Icon icon="mingcute:chart-line" className="text-white" width={20} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Market Salary Benchmarks</h4>
            <p className="text-xs text-slate-500">Labor statistics for {jobTitle}</p>
          </div>
        </div>
        {benchmark.cached && (
          <span className="text-xs text-slate-500 flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-full border border-slate-200">
            <Icon icon="mingcute:time-line" width={14} />
            Cached
          </span>
        )}
      </div>

      {/* Percentile Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 25th Percentile */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-300 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">25th Percentile</div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(benchmark.percentile25)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Lower range</div>
        </div>

        {/* 50th Percentile (Median) - Highlighted */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 border-2 border-blue-400 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-white/80"></div>
              <div className="text-xs font-semibold text-white/90 uppercase tracking-wide">Median</div>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(benchmark.percentile50)}
            </div>
            <div className="text-xs text-blue-100 mt-1 font-medium">Market average</div>
          </div>
        </div>

        {/* 75th Percentile */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-300 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">75th Percentile</div>
          </div>
          <div className="text-2xl font-bold text-purple-800">
            {formatCurrency(benchmark.percentile75)}
          </div>
          <div className="text-xs text-purple-600 mt-1">Upper range</div>
        </div>
      </div>

      {/* Comparison Section */}
      {comparison && (
        <div className="mb-6 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              comparison.level === "above_75"
                ? "bg-green-100"
                : comparison.level === "below_25"
                ? "bg-red-100"
                : "bg-blue-100"
            }`}>
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
                width={20}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">Your Offer Position</div>
              <div className={`text-sm font-medium ${
                comparison.level === "above_75"
                  ? "text-green-700"
                  : comparison.level === "below_25"
                  ? "text-red-700"
                  : "text-blue-700"
              }`}>
                {comparison.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-300/50">
        <div className="flex items-start gap-2">
          <Icon icon="mingcute:information-line" className="text-slate-400 mt-0.5 flex-shrink-0" width={16} />
          <div className="flex-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-medium">Source:</span> {benchmark.source === "bls" ? "US Bureau of Labor Statistics" : benchmark.source}
              {benchmark.dataYear && ` • ${benchmark.dataYear}`}
              {benchmark.lastUpdated && (
                <span className="block mt-1 text-slate-500">
                  Updated: {new Date(benchmark.lastUpdated).toLocaleDateString()}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-2 italic">
              Salary data is provided for informational purposes only. Actual salaries may vary based on experience, company size, and other factors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

