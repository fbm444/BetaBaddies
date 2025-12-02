import { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { SalaryProgression, DateRange } from "../../types/analytics.types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface SalaryProgressionProps {
  dateRange?: DateRange;
}

type TabType = "history" | "negotiations" | "market-research";

export function SalaryProgression({ dateRange }: SalaryProgressionProps) {
  const [data, setData] = useState<SalaryProgression | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("history");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getSalaryProgression(dateRange);
        if (response.ok && response.data?.progression) {
          // response.data.progression is the full SalaryProgression object with progression, byIndustry, ongoingNegotiations
          setData(response.data.progression);
        } else {
          setError("Failed to load salary progression data");
        }
      } catch (err: any) {
        console.error("Failed to fetch salary progression:", err);
        setError(err.message || "Failed to load salary progression data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percentage growth between consecutive months
  const calculateGrowth = (current: number | null, previous: number | null): number | null => {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Initialize data with empty structure if null (after early returns)
  const safeData: SalaryProgression = data || {
    progression: [],
    byIndustry: [],
    ongoingNegotiations: [],
  };

  // Prepare chart data with growth percentages
  // Chart should show oldest to newest (left to right), but list shows newest first
  const chartData = useMemo(() => {
    if (!safeData || safeData.progression.length === 0) return [];
    
    // Sort progression chronologically (oldest to newest) for chart
    const sortedProgression = [...safeData.progression].sort((a, b) => a.month.localeCompare(b.month));
    
    return sortedProgression.map((item, index) => {
      const previousItem = index > 0 ? sortedProgression[index - 1] : null;
      const currentSalary = item.avgMax || item.avgMin;
      const previousSalary = previousItem ? (previousItem.avgMax || previousItem.avgMin) : null;
      const growth = calculateGrowth(currentSalary, previousSalary);
      
      return {
        ...item,
        salary: currentSalary,
        growth,
        monthLabel: new Date(item.month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      };
    });
  }, [safeData]);

  // Get ongoing negotiations from backend data
  const ongoingNegotiations = useMemo(() => {
    if (!safeData || !safeData.ongoingNegotiations || safeData.ongoingNegotiations.length === 0) return [];
    
    return safeData.ongoingNegotiations.map(item => ({
      ...item,
      monthLabel: new Date(item.month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    }));
  }, [safeData]);

  // Get market research data (by industry and location)
  const marketResearchData = useMemo(() => {
    if (!safeData) return { byIndustry: [], byLocation: [] };
    
    // Extract location data from byIndustry
    const locationMap = new Map<string, {
      location: string;
      salaries: number[];
      counts: number[];
      locationAverages: number[];
    }>();
    
    (safeData.byIndustry || []).forEach(item => {
      if (item.location) {
        const locations = item.location.split(', ');
        locations.forEach(loc => {
          if (!locationMap.has(loc)) {
            locationMap.set(loc, {
              location: loc,
              salaries: [],
              counts: [],
              locationAverages: [],
            });
          }
          const locData = locationMap.get(loc)!;
          if (item.avgMax !== null) locData.salaries.push(item.avgMax);
          if (item.avgMin !== null) locData.salaries.push(item.avgMin);
          locData.counts.push(item.count);
          if (item.locationAverage !== null) locData.locationAverages.push(item.locationAverage);
        });
      }
    });
    
    const byLocation = Array.from(locationMap.values()).map(locData => {
      const avgMin = locData.salaries.length > 0 
        ? Math.min(...locData.salaries.filter(s => s > 0))
        : null;
      const avgMax = locData.salaries.length > 0 
        ? Math.max(...locData.salaries.filter(s => s > 0))
        : null;
      const count = locData.counts.reduce((sum, c) => sum + c, 0);
      const locationAverage = locData.locationAverages.length > 0
        ? Math.round(locData.locationAverages.reduce((sum, a) => sum + a, 0) / locData.locationAverages.length)
        : null;
      const vsLocation = avgMax && locationAverage
        ? Math.round(((avgMax - locationAverage) / locationAverage) * 100 * 10) / 10
        : null;
      
      return {
        location: locData.location,
        avgMin,
        avgMax,
        count,
        locationAverage,
        vsLocation,
      };
    }).sort((a, b) => (b.avgMax || 0) - (a.avgMax || 0));
    
    return {
      byIndustry: safeData.byIndustry || [],
      byLocation,
    };
  }, [safeData]);

  // Get min/max for display in growth metrics
  const salaryValues = chartData.filter(d => d.salary !== null).map(d => d.salary!);
  const minSalary = salaryValues.length > 0 ? Math.min(...salaryValues) : 0;
  const maxSalary = salaryValues.length > 0 ? Math.max(...salaryValues) : 100000;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#3351FD]" />
          <p className="text-sm text-[#6D7A99]">Loading salary progression...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load salary progression. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Salary Progression</h2>
        <p className="text-slate-600 mb-6 font-poppins">
          Track your salary history, ongoing negotiations, and market research to understand your earning potential.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E4E8F5]">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "text-[#3351FD] border-b-2 border-[#3351FD]"
              : "text-[#6D7A99] hover:text-[#0F1D3A]"
          }`}
        >
          Historical Data
        </button>
        <button
          onClick={() => setActiveTab("negotiations")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "negotiations"
              ? "text-[#3351FD] border-b-2 border-[#3351FD]"
              : "text-[#6D7A99] hover:text-[#0F1D3A]"
          }`}
        >
          Ongoing Negotiations
          {ongoingNegotiations.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
              {ongoingNegotiations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("market-research")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "market-research"
              ? "text-[#3351FD] border-b-2 border-[#3351FD]"
              : "text-[#6D7A99] hover:text-[#0F1D3A]"
          }`}
        >
          Market Research
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Chart Section */}
          {chartData.length > 0 && (
            <div className="rounded-3xl bg-white p-6 border border-slate-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[25px] font-normal text-[#0F1D3A]">Salary Progression Chart</h3>
                <div className="flex items-center gap-4 text-sm text-[#6D7A99]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3351FD]"></div>
                    <span>Salary</span>
                  </div>
                </div>
              </div>
              
              {/* Area Chart with Gradient */}
              <div className="mt-12">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.filter(d => d.salary !== null)} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3351FD" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#3351FD" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF8" />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fill: '#6D7A99', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#6D7A99', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                      return `$${value}`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontFamily: 'Poppins',
                      backgroundColor: 'white',
                      border: '1px solid #E8EBF8',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => {
                      const dataPoint = chartData.find(d => d.salary === value);
                      if (!dataPoint) return [formatCurrency(value), 'Salary'];
                      const growthText = dataPoint.growth !== null 
                        ? ` (${dataPoint.growth > 0 ? '+' : ''}${dataPoint.growth.toFixed(1)}%)`
                        : '';
                      return [`${formatCurrency(value)}${growthText}`, 'Salary'];
                    }}
                    labelStyle={{ fontFamily: 'Poppins', fontWeight: 500 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="salary"
                    stroke="#3351FD"
                    strokeWidth={3}
                    fill="url(#salaryGradient)"
                    name="Salary"
                  />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Growth Metrics */}
              {chartData.length > 1 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#E8EBF8]">
                  {(() => {
                    const firstSalary = chartData[0]?.salary;
                    const lastSalary = chartData[chartData.length - 1]?.salary;
                    const totalGrowth = calculateGrowth(lastSalary, firstSalary);
                    const avgGrowth = chartData
                      .filter(d => d.growth !== null)
                      .reduce((sum, d) => sum + (d.growth || 0), 0) / 
                      chartData.filter(d => d.growth !== null).length;
                    
                    return (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-[#6D7A99] mb-1">Total Growth</p>
                          <p className={`text-2xl font-semibold ${
                            totalGrowth && totalGrowth > 0 ? 'text-green-600' : 
                            totalGrowth && totalGrowth < 0 ? 'text-red-600' : 
                            'text-[#6D7A99]'
                          }`}>
                            {totalGrowth !== null ? `${totalGrowth > 0 ? '+' : ''}${totalGrowth.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[#6D7A99] mb-1">Average Monthly Growth</p>
                          <p className={`text-2xl font-semibold ${
                            avgGrowth > 0 ? 'text-green-600' : 
                            avgGrowth < 0 ? 'text-red-600' : 
                            'text-[#6D7A99]'
                          }`}>
                            {!isNaN(avgGrowth) ? `${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}%` : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[#6D7A99] mb-1">Salary Range</p>
                          <p className="text-2xl font-semibold text-[#0F1D3A]">
                            {formatCurrency(minSalary)} - {formatCurrency(maxSalary)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Detailed List */}
          {safeData.progression.length > 0 && (
            <div className="rounded-3xl bg-white p-6 border border-slate-300">
              <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Salary History</h3>
              <div className="space-y-4">
                {[...safeData.progression].reverse().map((item, index) => {
                  const date = new Date(item.month + "-01");
                  const monthLabel = date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  });
                  const chartItem = chartData[index];
                  const growth = chartItem?.growth;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#0F1D3A] mb-1">{monthLabel}</p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {item.avgMin !== null && item.avgMax !== null && (
                            <p className="text-xs text-[#6D7A99]">
                              Range: {formatCurrency(item.avgMin)} - {formatCurrency(item.avgMax)}
                            </p>
                          )}
                          {growth !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              growth > 0 ? 'bg-green-100 text-green-700' :
                              growth < 0 ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {growth > 0 ? '+' : ''}{growth.toFixed(1)}% growth
                            </span>
                          )}
                          {item.type === 'offer' && item.count > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {item.count} offer{item.count !== 1 ? "s" : ""}
                            </span>
                          )}
                          {item.type === 'employment' && item.count > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {item.count} employment record{item.count !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {item.avgMax !== null ? (
                          <>
                            <p className="text-lg font-semibold text-[#3351FD]">
                              {formatCurrency(item.avgMax)}
                            </p>
                            <p className="text-xs text-[#6D7A99]">avg max</p>
                          </>
                        ) : (
                          <p className="text-sm text-[#6D7A99]">No data</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ongoing Negotiations Tab */}
      {activeTab === "negotiations" && (
        <div className="space-y-6">
          {ongoingNegotiations.length > 0 ? (
            <div className="rounded-3xl bg-white p-6 border border-slate-300">
              <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Ongoing Salary Negotiations</h3>
              <div className="space-y-4">
                {ongoingNegotiations.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F1D3A] mb-1">{item.title} - {item.company}</p>
                        <p className="text-xs text-[#6D7A99]">
                          {item.location || "Location not specified"}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.negotiationStatus?.includes('in_progress') || item.negotiationStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        item.negotiationStatus?.includes('stalled') || item.negotiationStatus === 'stalled' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.negotiationStatus 
                          ? item.negotiationStatus.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : 'Not Started'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-[#6D7A99] mb-1">Base Salary</p>
                        <p className="text-lg font-semibold text-[#0F1D3A]">
                          {item.salaryMax 
                            ? (item.salaryMin && item.salaryMin !== item.salaryMax 
                                ? `${formatCurrency(item.salaryMin)} - ${formatCurrency(item.salaryMax)}`
                                : formatCurrency(item.salaryMax))
                            : item.salaryMin 
                              ? formatCurrency(item.salaryMin)
                              : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6D7A99] mb-1">Bonus</p>
                        <p className="text-sm font-semibold text-[#0F1D3A]">
                          {item.bonus ? formatCurrency(item.bonus) : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6D7A99] mb-1">Equity</p>
                        <p className="text-sm font-semibold text-[#0F1D3A]">
                          {item.equity ? formatCurrency(item.equity) : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6D7A99] mb-1">Total Compensation</p>
                        <p className="text-lg font-semibold text-[#3351FD]">
                          {formatCurrency((item.salaryMax || item.salaryMin || 0) + (item.bonus || 0) + (item.equity || 0))}
                        </p>
                      </div>
                    </div>
                    {item.overtime && (
                      <div className="mt-3 pt-3 border-t border-[#E8EBF8]">
                        <p className="text-xs text-[#6D7A99] mb-1">Overtime</p>
                        <p className="text-sm font-medium text-[#0F1D3A] capitalize">{item.overtime}</p>
                      </div>
                    )}
                    {item.notes && (
                      <div className="mt-3 pt-3 border-t border-[#E8EBF8]">
                        <p className="text-xs text-[#6D7A99] mb-1">Negotiation Notes</p>
                        <p className="text-sm text-[#0F1D3A] whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
              <Icon icon="mingcute:handshake-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
              <p className="text-sm text-[#6D7A99]">
                No ongoing negotiations. When you receive offers, they will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Market Research Tab */}
      {activeTab === "market-research" && (
        <div className="space-y-6">
          {/* By Industry */}
          {marketResearchData.byIndustry && marketResearchData.byIndustry.length > 0 && (
            <div className="rounded-3xl bg-white p-6 border border-slate-300">
              <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Market Research by Industry</h3>
              <div className="space-y-3">
                {marketResearchData.byIndustry.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#0F1D3A]">{item.industry}</span>
                      <span className="text-xs text-[#6D7A99]">{item.count} offer{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    {item.avgMin !== null && item.avgMax !== null ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-[#6D7A99] mb-1">Your Range</p>
                            <p className="text-lg font-semibold text-[#0F1D3A]">
                              {formatCurrency(item.avgMin)} - {formatCurrency(item.avgMax)}
                            </p>
                          </div>
                          {item.industryAverage !== null && (
                            <div>
                              <p className="text-xs text-[#6D7A99] mb-1">Industry Average</p>
                              <p className="text-lg font-semibold text-[#3351FD]">
                                {formatCurrency(item.industryAverage)}
                              </p>
                            </div>
                          )}
                          {item.vsIndustry !== null && (
                            <div className="ml-auto">
                              <p className="text-xs text-[#6D7A99] mb-1">vs Market</p>
                              <p className={`text-lg font-semibold ${
                                item.vsIndustry > 0 ? 'text-green-600' : 
                                item.vsIndustry < 0 ? 'text-red-600' : 
                                'text-[#6D7A99]'
                              }`}>
                                {item.vsIndustry > 0 ? '+' : ''}{item.vsIndustry}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#6D7A99]">No salary data available</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Location */}
          {marketResearchData.byLocation && marketResearchData.byLocation.length > 0 && (
            <div className="rounded-3xl bg-white p-6 border border-slate-300">
              <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Market Research by Location</h3>
              <div className="space-y-3">
                {marketResearchData.byLocation.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-[#E8EBF8] bg-[#FDFDFF]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#0F1D3A]">{item.location}</span>
                      <span className="text-xs text-[#6D7A99]">{item.count} offer{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    {item.avgMin !== null && item.avgMax !== null ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-[#6D7A99] mb-1">Your Range</p>
                            <p className="text-lg font-semibold text-[#0F1D3A]">
                              {formatCurrency(item.avgMin)} - {formatCurrency(item.avgMax)}
                            </p>
                          </div>
                          {item.locationAverage !== null && (
                            <div>
                              <p className="text-xs text-[#6D7A99] mb-1">Location Average</p>
                              <p className="text-lg font-semibold text-[#3351FD]">
                                {formatCurrency(item.locationAverage)}
                              </p>
                            </div>
                          )}
                          {item.vsLocation !== null && (
                            <div className="ml-auto">
                              <p className="text-xs text-[#6D7A99] mb-1">vs Market</p>
                              <p className={`text-lg font-semibold ${
                                item.vsLocation > 0 ? 'text-green-600' : 
                                item.vsLocation < 0 ? 'text-red-600' : 
                                'text-[#6D7A99]'
                              }`}>
                                {item.vsLocation > 0 ? '+' : ''}{item.vsLocation}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#6D7A99]">No salary data available</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!marketResearchData.byIndustry || marketResearchData.byIndustry.length === 0) && 
           (!marketResearchData.byLocation || marketResearchData.byLocation.length === 0) && (
            <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
              <Icon icon="mingcute:chart-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
              <p className="text-sm text-[#6D7A99]">
                No market research data available. Receive job offers to see market comparisons.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State for all tabs - only show if no data at all */}
      {(!safeData || safeData.progression.length === 0) && (!safeData?.byIndustry || safeData.byIndustry.length === 0) && activeTab === "history" && (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:money-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99]">
            No salary data available yet. Add employment history to track salary progression.
          </p>
        </div>
      )}
    </div>
  );
}
