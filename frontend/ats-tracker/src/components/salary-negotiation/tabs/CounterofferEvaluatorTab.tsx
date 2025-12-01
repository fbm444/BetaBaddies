import { useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../../services/api";
import type { SalaryNegotiation, CounterofferInput, CounterofferEvaluation } from "../../../types";

interface CounterofferEvaluatorTabProps {
  negotiation: SalaryNegotiation;
  onUpdate: () => void;
}

export function CounterofferEvaluatorTab({
  negotiation,
  onUpdate,
}: CounterofferEvaluatorTabProps) {
  const [formData, setFormData] = useState<CounterofferInput>({
    baseSalary: 0,
    bonus: 0,
    equity: 0,
    benefitsValue: 0,
    notes: "",
  });
  const [evaluation, setEvaluation] = useState<CounterofferEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    if (!formData.baseSalary || formData.baseSalary <= 0) {
      setError("Please enter a base salary");
      return;
    }

    try {
      setIsEvaluating(true);
      setError(null);
      const response = await api.evaluateCounteroffer(negotiation.id, formData);

      if (response.ok && response.data?.evaluation) {
        setEvaluation(response.data.evaluation);
      } else {
        setError(response.error || "Failed to evaluate counteroffer");
      }
    } catch (err: any) {
      console.error("Failed to evaluate counteroffer:", err);
      setError(err.message || "Failed to evaluate counteroffer");
    } finally {
      setIsEvaluating(false);
    }
  };

  const counterofferTotal =
    (formData.baseSalary || 0) +
    (formData.bonus || 0) +
    (formData.equity || 0) +
    (formData.benefitsValue || 0);

  const initialTotal = negotiation.initialOffer?.totalCompensation || 0;
  const targetTotal = negotiation.targetCompensation?.totalCompensation || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Counteroffer Evaluator</h3>
        <p className="text-sm text-slate-600 mt-1">
          Get AI-powered evaluation of your counteroffer proposal
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Icon icon="mingcute:alert-line" width={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Counteroffer Details</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Base Salary <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formData.baseSalary || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="200000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bonus</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formData.bonus || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="30000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Equity</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formData.equity || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, equity: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Benefits Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formData.benefitsValue || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benefitsValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            {counterofferTotal > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Total Counteroffer:</p>
                <p className="text-2xl font-bold text-blue-900">${counterofferTotal.toLocaleString()}</p>
              </div>
            )}

            <button
              onClick={handleEvaluate}
              disabled={isEvaluating || !formData.baseSalary || formData.baseSalary <= 0}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isEvaluating ? "Evaluating..." : "Evaluate Counteroffer"}
            </button>
          </div>
        </div>

        {/* Evaluation Results */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Evaluation Results</h4>
          {evaluation ? (
            <div className="space-y-4">
              {/* Comparison */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Initial Offer:</span>
                  <span className="font-medium">${evaluation.initialTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Counteroffer:</span>
                  <span className="font-medium text-blue-600">
                    ${evaluation.counterofferTotal.toLocaleString()}
                  </span>
                </div>
                {targetTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Target:</span>
                    <span className="font-medium text-green-600">
                      ${evaluation.targetTotal.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                {evaluation.improvementFromInitial > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Improvement from Initial:</span>
                    <span className="font-medium text-green-600">
                      +${evaluation.improvementFromInitial.toLocaleString()} (
                      +{evaluation.percentImprovement.toFixed(1)}%)
                    </span>
                  </div>
                )}
                {targetTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Difference from Target:</span>
                    <span
                      className={`font-medium ${
                        evaluation.differenceFromTarget >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {evaluation.differenceFromTarget >= 0 ? "+" : ""}
                      ${evaluation.differenceFromTarget.toLocaleString()} (
                      {evaluation.percentFromTarget >= 0 ? "+" : ""}
                      {evaluation.percentFromTarget.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Recommendation</p>
                <p className="text-sm text-blue-800">{evaluation.recommendation}</p>
              </div>

              {/* Market Comparison */}
              {evaluation.marketComparison && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Market Position</p>
                  <p className="text-sm text-slate-700">
                    Your counteroffer is at the{" "}
                    <span className="font-medium">{evaluation.marketComparison.percentile}th percentile</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {evaluation.marketComparison.recommendation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Icon icon="mingcute:file-search-line" width={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-sm">Enter counteroffer details and click "Evaluate" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

