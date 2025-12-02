import { Icon } from "@iconify/react";
import type { TimingPattern } from "../../types/analytics.types";

interface TimingPatternsCardProps {
  patterns: TimingPattern[];
}

export function TimingPatternsCard({ patterns }: TimingPatternsCardProps) {
  const dayOfWeekPatterns = patterns.filter(p => p.type === 'day_of_week');
  const timeOfDayPatterns = patterns.filter(p => p.type === 'time_of_day');
  
  return (
    <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mingcute:calendar-time-add-line" className="text-[#3351FD]" width={24} />
        <h3 className="text-[25px] font-normal text-[#0F1D3A]">
          Optimal Timing Patterns
        </h3>
      </div>
      
      <p className="text-sm text-[#6D7A99] mb-4">
        When you have the best success with applications
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of week */}
        {dayOfWeekPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#0F1D3A] mb-3">
              Best Days to Apply
            </h4>
            <div className="space-y-2">
              {dayOfWeekPatterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-[#0F1D3A]">{pattern.value}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#EEF0FB] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#3351FD]"
                        style={{ width: `${Math.min(pattern.successRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#0F1D3A] w-12 text-right">
                      {pattern.successRate}%
                    </span>
                    {pattern.isOptimal && (
                      <Icon icon="mingcute:star-fill" className="text-yellow-500" width={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Time of day */}
        {timeOfDayPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#0F1D3A] mb-3">
              Best Time of Day
            </h4>
            <div className="space-y-2">
              {timeOfDayPatterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-[#0F1D3A]">{pattern.value}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#EEF0FB] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#3351FD]"
                        style={{ width: `${Math.min(pattern.successRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#0F1D3A] w-12 text-right">
                      {pattern.successRate}%
                    </span>
                    {pattern.isOptimal && (
                      <Icon icon="mingcute:star-fill" className="text-yellow-500" width={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {patterns.length === 0 && (
        <div className="text-center py-8 text-[#6D7A99]">
          <Icon icon="mingcute:calendar-line" className="mx-auto mb-2" width={40} />
          <p className="text-sm">Not enough data yet to identify timing patterns</p>
        </div>
      )}
    </div>
  );
}

