import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";
import type { SalaryNegotiation, TimingStrategy } from "../../../types";

interface TimingStrategyTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: (updatedNegotiation?: SalaryNegotiation) => void;
}

export function TimingStrategyTab({
  negotiation,
  onUpdate,
}: TimingStrategyTabProps) {
  // Check if timing strategy is cached in negotiation object
  const getCachedStrategy = (): TimingStrategy | null => {
    if (negotiation.negotiationStrategy?.timingStrategy) {
      const cached = negotiation.negotiationStrategy.timingStrategy;
      if (typeof cached === 'string') {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return null;
        }
      }
      return cached as TimingStrategy;
    }
    return null;
  };

  const cachedStrategy = getCachedStrategy();
  const [timingStrategy, setTimingStrategy] = useState<TimingStrategy | null>(cachedStrategy);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update when negotiation changes
    const cached = getCachedStrategy();
    if (cached) {
      setTimingStrategy(cached);
    } else if (!timingStrategy) {
      // Only fetch if we don't have cached data and no current strategy
      fetchTimingStrategy();
    }
  }, [negotiation.id, negotiation.negotiationStrategy]);

  const fetchTimingStrategy = async (forceRegenerate = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getTimingStrategy(negotiation.id);

      if (response.ok && response.data?.strategy) {
        const newStrategy = response.data.strategy;
        setTimingStrategy(newStrategy);
        
        // Update the negotiation object with cached timing strategy
        const updatedNegotiation = {
          ...negotiation,
          negotiationStrategy: {
            ...negotiation.negotiationStrategy,
            timingStrategy: newStrategy,
          },
        };
        onUpdate(updatedNegotiation);
      } else {
        setError(response.error || "Failed to get timing strategy");
      }
    } catch (err: any) {
      console.error("Failed to get timing strategy:", err);
      setError(err.message || "Failed to get timing strategy");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Timing Strategy</h3>
          <p className="text-sm text-slate-600 mt-1">
            AI-recommended timing for your salary negotiation
          </p>
        </div>
        <button
          onClick={() => fetchTimingStrategy(true)}
          disabled={isLoading}
          className="text-sm text-blue-600 flex items-center gap-1.5 disabled:opacity-50 bg-transparent hover:bg-transparent border-none p-0 cursor-pointer"
          style={{ outline: 'none' }}
        >
          <Icon icon="mingcute:refresh-line" width={16} height={16} className="flex-shrink-0 inline-block" style={{ display: 'inline-block' }} />
          <span>Regenerate</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Icon
            icon="mingcute:loading-line"
            className="w-8 h-8 animate-spin text-blue-500"
          />
        </div>
      ) : timingStrategy ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
              Cached
            </span>
          </div>
          {/* When to Negotiate */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="mingcute:calendar-line" width={20} className="text-blue-500" />
              <h4 className="text-lg font-semibold text-slate-900">When to Negotiate</h4>
            </div>
            <p className="text-slate-700 whitespace-pre-wrap">{timingStrategy.whenToNegotiate}</p>
          </div>

          {/* When to Respond */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="mingcute:time-line" width={20} className="text-green-500" />
              <h4 className="text-lg font-semibold text-slate-900">When to Respond</h4>
            </div>
            <p className="text-slate-700 whitespace-pre-wrap">{timingStrategy.whenToRespond}</p>
          </div>

          {/* Timeline */}
          {timingStrategy.timeline && timingStrategy.timeline.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="mingcute:route-line" width={20} className="text-purple-500" />
                <h4 className="text-lg font-semibold text-slate-900">Timeline</h4>
              </div>
              <div className="space-y-3">
                {timingStrategy.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 flex-1">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {timingStrategy.tips && timingStrategy.tips.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="mingcute:lightbulb-line" width={20} className="text-blue-600" />
                <h4 className="text-lg font-semibold text-blue-900">Tips</h4>
              </div>
              <ul className="space-y-2">
                {timingStrategy.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800">
                    <Icon icon="mingcute:check-circle-line" width={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-12 text-center border border-slate-200">
          <Icon icon="mingcute:time-line" width={48} className="text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No timing strategy available</p>
          <p className="text-sm text-slate-500">
            Timing strategy will be generated automatically
          </p>
        </div>
      )}
    </div>
  );
}

