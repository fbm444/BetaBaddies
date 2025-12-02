import { Icon } from "@iconify/react";
import type { PredictiveScore } from "../../types/analytics.types";

interface PredictiveScoresCardProps {
  scores: PredictiveScore[];
}

export function PredictiveScoresCard({ scores }: PredictiveScoresCardProps) {
  // Sort by success probability
  const sortedScores = [...scores].sort((a, b) => b.successProbability - a.successProbability);
  
  return (
    <div className="rounded-3xl bg-white p-6 border border-[#E4E8F5] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mingcute:ai-line" className="text-[#3351FD]" width={24} />
        <h3 className="text-[25px] font-normal text-[#0F1D3A]">
          Predictive Success Scores
        </h3>
      </div>
      
      <p className="text-sm text-[#6D7A99] mb-4">
        AI-powered predictions for all your opportunities (active jobs shown first)
      </p>
      
      <div className="space-y-4">
        {sortedScores.slice(0, 20).map((score) => (
          <div key={score.jobOpportunityId} className="p-4 rounded-xl border border-[#E8EBF8] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[#0F1D3A]">
                    {score.jobTitle}
                  </h4>
                  {(score as any).status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      (score as any).status === 'Offer' ? 'bg-green-100 text-green-700' :
                      (score as any).status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      (score as any).status === 'Withdrawn' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {(score as any).status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6D7A99]">{score.company}</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-extralight font-poppins ${
                  score.successProbability >= 60 ? 'text-green-600' :
                  score.successProbability >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {score.successProbability}%
                </div>
                <div className="text-xs text-[#6D7A99]">predicted</div>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="mb-3">
              <div className="text-xs mb-1">
                <span className="text-[#6D7A99]">Industry benchmark:</span>
                <span className="ml-1 font-extralight text-[#0F1D3A] font-poppins">
                  {score.breakdown.industryBenchmark}%
                </span>
              </div>
              <div className="text-xs">
                <span className="text-[#6D7A99]">Your history:</span>
                <span className="ml-1 font-extralight text-[#0F1D3A] font-poppins">
                  {score.breakdown.userHistoricalRate}%
                </span>
              </div>
            </div>

            {/* Confidence */}
            <div className="mb-3">
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                score.confidence === 'high' ? 'bg-green-100 text-green-700' :
                score.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                score.confidence === 'low' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {score.confidence} confidence ({score.sampleSize} similar applications)
              </div>
            </div>
            
            {/* Recommended actions */}
            {score.recommendedActions && score.recommendedActions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#E8EBF8]">
                <div className="text-xs font-semibold text-[#0F1D3A] mb-2">
                  Recommended Actions:
                </div>
                <ul className="space-y-1">
                  {score.recommendedActions.map((action, actionIdx) => (
                    <li key={actionIdx} className="flex items-start gap-2 text-xs text-[#6D7A99]">
                      <Icon icon="mingcute:check-circle-line" className="text-[#3351FD] mt-0.5 flex-shrink-0" width={14} />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {sortedScores.length === 0 && (
        <div className="text-center py-8 text-[#6D7A99]">
          <Icon icon="mingcute:search-line" className="mx-auto mb-2" width={40} />
          <p className="text-sm">No job opportunities found</p>
          <p className="text-xs mt-1">Add job opportunities to see AI-powered success predictions</p>
        </div>
      )}
    </div>
  );
}

