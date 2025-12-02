import { Icon } from "@iconify/react";
import type { SuccessPattern } from "../../types/analytics.types";

interface SuccessPatternsCardProps {
  patterns: SuccessPattern[];
}

export function SuccessPatternsCard({ patterns }: SuccessPatternsCardProps) {
  return (
    <div className="rounded-3xl bg-white p-6 border border-slate-300 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mingcute:chart-bar-line" className="text-[#3351FD]" width={24} />
        <h3 className="text-[25px] font-normal text-[#0F1D3A]">
          Your Success Patterns
        </h3>
      </div>
      
      <p className="text-sm text-[#6D7A99] mb-4">
        Combinations of factors that led to your best outcomes
      </p>
      
      <div className="space-y-4">
        {patterns.map((pattern, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-[#F8F9FF] to-white border border-[#E8EBF8]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0F1D3A]">
                  {pattern.pattern}
                </p>
                <p className="text-xs text-[#6D7A99] mt-1">
                  Based on {pattern.sampleSize} applications
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extralight text-[#3351FD] font-poppins">
                  {pattern.successRate}%
                </div>
                <div className="text-xs text-[#6D7A99]">success rate</div>
              </div>
            </div>
            
            {/* Confidence indicator */}
            <div className="flex items-center gap-2 mt-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                pattern.confidence === 'high' ? 'bg-green-100 text-green-700' :
                pattern.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {pattern.confidence} confidence
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {patterns.length === 0 && (
        <div className="text-center py-8 text-[#6D7A99]">
          <Icon icon="mingcute:information-line" className="mx-auto mb-2" width={40} />
          <p className="text-sm">Not enough data yet to identify patterns</p>
          <p className="text-xs mt-1">Apply to 5+ jobs to see patterns emerge</p>
        </div>
      )}
    </div>
  );
}

