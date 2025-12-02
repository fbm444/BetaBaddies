import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type { SalaryProgression, DateRange } from "../../types/analytics.types";

interface SalaryProgressionProps {
  dateRange?: DateRange;
}

export function SalaryProgression({ dateRange }: SalaryProgressionProps) {
  const [data, setData] = useState<SalaryProgression | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.getSalaryProgression(dateRange);
        if (response.ok && response.data?.progression) {
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

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#F5C4C4] bg-[#FDECEC] p-10 text-center">
        <Icon icon="mingcute:alert-line" className="mx-auto mb-3 text-red-500" width={40} />
        <p className="text-sm font-medium text-red-700">
          {error || "Failed to load salary progression. Please try again later."}
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Salary Progression Over Time */}
      {data.progression.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Salary Progression Over Time</h3>
          <div className="space-y-4">
            {data.progression.map((item, index) => {
              const date = new Date(item.month + "-01");
              const monthLabel = date.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              });

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
                      {item.location && (
                        <p className="text-xs text-[#6D7A99]">
                          📍 {item.location.split(', ')[0]}
                          {item.location.split(', ').length > 1 && ` +${item.location.split(', ').length - 1}`}
                        </p>
                      )}
                      {item.negotiationStatus && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.negotiationStatus.includes('accepted') ? 'bg-green-100 text-green-700' :
                          item.negotiationStatus.includes('negotiating') ? 'bg-blue-100 text-blue-700' :
                          item.negotiationStatus.includes('rejected') ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.negotiationStatus.split(', ')[0]}
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

      {/* Salary by Industry */}
      {data.byIndustry.length > 0 && (
        <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5]">
          <h3 className="text-[25px] font-normal text-[#0F1D3A] mb-4">Salary by Industry</h3>
          <div className="space-y-3">
            {data.byIndustry.map((item, index) => (
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
                        <p className="text-xs text-[#6D7A99] mb-1">Min</p>
                        <p className="text-lg font-semibold text-[#0F1D3A]">
                          {formatCurrency(item.avgMin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6D7A99] mb-1">Max</p>
                        <p className="text-lg font-semibold text-[#3351FD]">
                          {formatCurrency(item.avgMax)}
                        </p>
                      </div>
                      {item.avgMin !== null && item.avgMax !== null && (
                        <div className="ml-auto">
                          <p className="text-xs text-[#6D7A99] mb-1">Range</p>
                          <p className="text-sm font-medium text-[#0F1D3A]">
                            {formatCurrency(item.avgMax - item.avgMin)}
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Industry and Location Comparison */}
                    {(item.industryAverage !== null || item.locationAverage !== null) && (
                      <div className="pt-2 border-t border-[#E8EBF8] flex items-center gap-4 flex-wrap">
                        {item.industryAverage !== null && (
                          <div>
                            <p className="text-xs text-[#6D7A99] mb-1">vs Industry Avg</p>
                            <p className={`text-sm font-medium ${
                              item.vsIndustry && item.vsIndustry > 0 ? 'text-green-600' : 
                              item.vsIndustry && item.vsIndustry < 0 ? 'text-red-600' : 
                              'text-[#6D7A99]'
                            }`}>
                              {item.vsIndustry !== null 
                                ? `${item.vsIndustry > 0 ? '+' : ''}${item.vsIndustry}%`
                                : 'N/A'
                              }
                            </p>
                          </div>
                        )}
                        {item.locationAverage !== null && (
                          <div>
                            <p className="text-xs text-[#6D7A99] mb-1">vs Location Avg</p>
                            <p className={`text-sm font-medium ${
                              item.vsLocation && item.vsLocation > 0 ? 'text-green-600' : 
                              item.vsLocation && item.vsLocation < 0 ? 'text-red-600' : 
                              'text-[#6D7A99]'
                            }`}>
                              {item.vsLocation !== null 
                                ? `${item.vsLocation > 0 ? '+' : ''}${item.vsLocation}%`
                                : 'N/A'
                              }
                            </p>
                          </div>
                        )}
                        {item.location && (
                          <div className="ml-auto">
                            <p className="text-xs text-[#6D7A99] mb-1">Location</p>
                            <p className="text-sm font-medium text-[#0F1D3A]">
                              {item.location.split(', ')[0]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
      {data.progression.length === 0 && data.byIndustry.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E4E8F5] bg-[#F8F8F8] p-10 text-center">
          <Icon icon="mingcute:money-line" className="mx-auto mb-3 text-[#6D7A99]" width={48} />
          <p className="text-sm text-[#6D7A99]">
            No salary data available yet. Receive job offers to track salary progression.
          </p>
        </div>
      )}
    </div>
  );
}

