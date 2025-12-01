import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";
import type { SalaryNegotiation, MarketSalaryData } from "../../../types";

interface MarketResearchTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: (updatedNegotiation?: SalaryNegotiation) => void;
}

export function MarketResearchTab({
  negotiation,
  onUpdate,
}: MarketResearchTabProps) {
  const [marketData, setMarketData] = useState<MarketSalaryData | null>(
    negotiation.marketSalaryData || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update market data when negotiation prop changes (cached data loaded)
  useEffect(() => {
    if (negotiation.marketSalaryData) {
      setMarketData(negotiation.marketSalaryData);
    }
  }, [negotiation.marketSalaryData]);

  const handleResearchMarket = async () => {
    if (!negotiation.jobTitle || !negotiation.location) {
      setError("Job title and location are required for market research");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.triggerMarketResearch(negotiation.id, {
        role: negotiation.jobTitle,
        location: negotiation.location || "",
        experienceLevel: undefined, // Could be extracted from profile
        industry: undefined,
      });

      if (response.ok && response.data?.marketData) {
        const newMarketData = response.data.marketData;
        setMarketData(newMarketData);
        
        // Update the negotiation object with new market data
        const updatedNegotiation = {
          ...negotiation,
          marketSalaryData: newMarketData,
        };
        onUpdate(updatedNegotiation);
      } else {
        setError(response.error || "Failed to research market data");
      }
    } catch (err: any) {
      console.error("Failed to research market:", err);
      setError(err.message || "Failed to research market data");
    } finally {
      setIsLoading(false);
    }
  };

  const offerTotal = negotiation.initialOffer?.totalCompensation || 0;

  return (
    <div className="space-y-6">
      {/* Header with Research Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Market Salary Research</h3>
          <p className="text-sm text-slate-600 mt-1">
            Get AI-powered market salary data for your role and location
          </p>
        </div>
        {!marketData && (
          <button
            onClick={handleResearchMarket}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Icon icon="mingcute:search-line" width={16} />
                Research Market Data
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {marketData ? (
        <div className="space-y-6">
          {/* Market Data Summary */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-slate-900">Market Data</h4>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                  Cached
                </span>
              </div>
              <button
                onClick={handleResearchMarket}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Icon icon="mingcute:refresh-line" width={16} />
                Regenerate
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">25th Percentile</p>
                <p className="text-lg font-bold text-slate-900">
                  ${marketData.percentile25.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-1 font-medium">50th Percentile (Median)</p>
                <p className="text-lg font-bold text-blue-900">
                  ${marketData.percentile50.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">75th Percentile</p>
                <p className="text-lg font-bold text-slate-900">
                  ${marketData.percentile75.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">90th Percentile</p>
                <p className="text-lg font-bold text-slate-900">
                  ${marketData.percentile90.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Your Offer Comparison */}
            {offerTotal > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-900">Your Initial Offer</p>
                  <p className="text-lg font-bold text-blue-900">${offerTotal.toLocaleString()}</p>
                </div>
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((offerTotal - marketData.percentile25) /
                          (marketData.percentile90 - marketData.percentile25)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  {offerTotal < marketData.percentile25
                    ? "Below 25th percentile"
                    : offerTotal < marketData.percentile50
                    ? "Between 25th-50th percentile"
                    : offerTotal < marketData.percentile75
                    ? "Between 50th-75th percentile"
                    : offerTotal < marketData.percentile90
                    ? "Between 75th-90th percentile"
                    : "Above 90th percentile"}
                </p>
              </div>
            )}

            {/* Market Insights */}
            {marketData.notes && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Insights</h5>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{marketData.notes}</p>
              </div>
            )}

            {/* Source Info */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Icon icon="mingcute:information-line" width={14} />
                <span>Source: {marketData.source}</span>
              </div>
              <span>Date: {new Date(marketData.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
          <Icon icon="mingcute:chart-line" width={48} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No market research data yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Click "Research Market Data" to get AI-powered market salary insights
          </p>
          <button
            onClick={handleResearchMarket}
            disabled={isLoading || !negotiation.jobTitle || !negotiation.location}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? "Researching..." : "Research Market Data"}
          </button>
        </div>
      )}
    </div>
  );
}

