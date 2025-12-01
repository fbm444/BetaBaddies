import { Icon } from "@iconify/react";
import type { SalaryNegotiation } from "../../../types";

interface NegotiationOverviewTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: () => void;
}

export function NegotiationOverviewTab({
  negotiation,
  onUpdate,
}: NegotiationOverviewTabProps) {
  const initialTotal = negotiation.initialOffer?.totalCompensation || 0;
  const targetTotal = negotiation.targetCompensation?.totalCompensation || 0;
  const finalTotal = negotiation.finalCompensation?.totalCompensation || 0;

  const differenceFromTarget = targetTotal > 0 ? initialTotal - targetTotal : 0;
  const percentFromTarget = targetTotal > 0 ? (differenceFromTarget / targetTotal) * 100 : 0;
  const improvementFromInitial = finalTotal > 0 ? finalTotal - initialTotal : 0;
  const percentImprovement = initialTotal > 0 ? (improvementFromInitial / initialTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              negotiation.status === "active"
                ? "bg-blue-100 text-blue-700"
                : negotiation.status === "completed"
                ? "bg-green-100 text-green-700"
                : negotiation.status === "archived"
                ? "bg-slate-100 text-slate-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {negotiation.status.toUpperCase()}
          </span>
        </div>
        {negotiation.outcome && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              negotiation.outcome === "accepted"
                ? "bg-green-100 text-green-700"
                : negotiation.outcome === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {negotiation.outcome.toUpperCase()}
          </span>
        )}
      </div>

      {/* Compensation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Initial Offer */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Initial Offer</p>
            <Icon icon="mingcute:file-line" width={20} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ${initialTotal.toLocaleString()}
          </p>
          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Base:</span>
              <span>${(negotiation.initialOffer?.baseSalary || 0).toLocaleString()}</span>
            </div>
            {negotiation.initialOffer?.bonus && (
              <div className="flex justify-between">
                <span>Bonus:</span>
                <span>${negotiation.initialOffer.bonus.toLocaleString()}</span>
              </div>
            )}
            {negotiation.initialOffer?.equity && (
              <div className="flex justify-between">
                <span>Equity:</span>
                <span>${negotiation.initialOffer.equity.toLocaleString()}</span>
              </div>
            )}
            {negotiation.initialOffer?.benefitsValue && (
              <div className="flex justify-between">
                <span>Benefits:</span>
                <span>${negotiation.initialOffer.benefitsValue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Compensation */}
        {targetTotal > 0 && (
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700">Target</p>
              <Icon icon="mingcute:target-line" width={20} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              ${targetTotal.toLocaleString()}
            </p>
            <div className="mt-3">
              {differenceFromTarget < 0 ? (
                <p className="text-xs text-red-600 font-medium">
                  ${Math.abs(differenceFromTarget).toLocaleString()} below target
                  ({Math.abs(percentFromTarget).toFixed(1)}%)
                </p>
              ) : (
                <p className="text-xs text-green-600 font-medium">
                  ${differenceFromTarget.toLocaleString()} above target
                  ({percentFromTarget.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Final Compensation */}
        {finalTotal > 0 && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-700">Final</p>
              <Icon icon="mingcute:check-circle-line" width={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-900">
              ${finalTotal.toLocaleString()}
            </p>
            {improvementFromInitial > 0 && (
              <div className="mt-3">
                <p className="text-xs text-green-600 font-medium">
                  +${improvementFromInitial.toLocaleString()} improvement
                  (+{percentImprovement.toFixed(1)}%)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compensation Breakdown Chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Compensation Breakdown</h3>
        <div className="space-y-4">
          {negotiation.initialOffer && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Initial Offer</span>
                <span className="font-medium">${initialTotal.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400" style={{ width: "100%" }} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-slate-600">
                <div>
                  Base: ${(negotiation.initialOffer.baseSalary || 0).toLocaleString()}
                </div>
                {negotiation.initialOffer.bonus && (
                  <div>Bonus: ${negotiation.initialOffer.bonus.toLocaleString()}</div>
                )}
                {negotiation.initialOffer.equity && (
                  <div>Equity: ${negotiation.initialOffer.equity.toLocaleString()}</div>
                )}
                {negotiation.initialOffer.benefitsValue && (
                  <div>Benefits: ${negotiation.initialOffer.benefitsValue.toLocaleString()}</div>
                )}
              </div>
            </div>
          )}

          {targetTotal > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Target</span>
                <span className="font-medium text-blue-600">${targetTotal.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(100, (targetTotal / initialTotal) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {finalTotal > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Final</span>
                <span className="font-medium text-green-600">${finalTotal.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${Math.min(100, (finalTotal / initialTotal) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Counteroffers</h4>
          <p className="text-2xl font-bold text-slate-900">{negotiation.counterofferCount}</p>
          {negotiation.latestCounteroffer && (
            <p className="text-xs text-slate-600 mt-1">
              Latest: ${negotiation.latestCounteroffer.totalCompensation.toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Practice Sessions</h4>
          <p className="text-2xl font-bold text-slate-900">
            {negotiation.practiceSessionsCompleted}
          </p>
        </div>
      </div>

      {/* Outcome Notes */}
      {negotiation.outcomeNotes && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Outcome Notes</h4>
          <p className="text-sm text-slate-600">{negotiation.outcomeNotes}</p>
        </div>
      )}
    </div>
  );
}

