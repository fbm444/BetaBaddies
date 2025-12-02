import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";
import type {
  InterviewPrediction,
  JobOpportunityData,
  Recommendation,
  FactorsBreakdown,
} from "../../types";

interface InterviewPredictionTabProps {
  jobOpportunities: JobOpportunityData[];
  interviews: any[];
}

export function InterviewPredictionTab({
  jobOpportunities,
  interviews,
}: InterviewPredictionTabProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<InterviewPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonPredictions, setComparisonPredictions] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Get active job opportunities (with interviews or in interview stage)
  const activeJobs = jobOpportunities.filter(
    (job) =>
      job.status === "Interview" ||
      job.status === "Applied" ||
      interviews.some((int) => int.job_opportunity_id === job.id)
  );

  useEffect(() => {
    if (selectedJobId) {
      loadPrediction(selectedJobId);
    } else {
      setPrediction(null);
      setError(null);
    }
  }, [selectedJobId]);

  const loadPrediction = async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getInterviewPrediction(jobId);
      if (response.ok && response.data?.prediction) {
        setPrediction(response.data.prediction);
      } else {
        // Prediction doesn't exist yet, user needs to calculate
        setPrediction(null);
      }
    } catch (err: any) {
      console.error("Failed to load prediction:", err);
      // 404 means prediction doesn't exist yet, which is fine
      if (err.status === 404 || err.message?.includes("not found")) {
        setPrediction(null);
        setError(null); // Clear error for 404
      } else {
        const errorMsg = err.detail || err.message || err.error?.message || "Failed to load prediction";
        setError(errorMsg);
        console.error("Full error object:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrediction = async (jobId: string) => {
    setIsCalculating(true);
    setError(null);
    try {
      const response = await api.calculateInterviewPrediction(jobId);
      if (response.ok && response.data?.prediction) {
        setPrediction(response.data.prediction);
      } else {
        const errorMsg = response.error?.message || response.error?.detail || "Failed to calculate prediction";
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Failed to calculate prediction:", err);
      const errorMsg = err.message || err.detail || err.error?.message || "Failed to calculate prediction";
      setError(errorMsg);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCompare = async () => {
    if (activeJobs.length < 2) {
      setError("You need at least 2 job opportunities to compare");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const jobIds = activeJobs.map((job) => job.id);
      const response = await api.compareInterviewPredictions(jobIds);
      if (response.ok && response.data?.predictions) {
        const predictions = response.data.predictions;
        if (predictions.length === 0) {
          setError("No predictions found. Please calculate predictions for at least one job opportunity first.");
          setShowComparison(false);
        } else {
          setComparisonPredictions(predictions);
          setShowComparison(true);
        }
      } else {
        const errorMsg = response.error?.message || response.error?.detail || "Failed to compare predictions";
        setError(errorMsg);
        setShowComparison(false);
      }
    } catch (err: any) {
      console.error("Failed to compare predictions:", err);
      const errorMsg = err.detail || err.message || err.error?.message || "Failed to compare predictions";
      setError(errorMsg);
      setShowComparison(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return "text-green-600";
    if (probability >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const selectedJob = activeJobs.find((job) => job.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Interview Success Predictions</h2>
          <p className="text-slate-600 mt-1">
            Get AI-powered predictions of your interview success probability
          </p>
        </div>
        {activeJobs.length >= 2 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCompare();
            }}
            disabled={isLoading || isCalculating}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Icon icon="mingcute:loading-line" width={20} className="animate-spin" />
                Comparing...
              </>
            ) : (
              <>Compare All</>
            )}
          </button>
        )}
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Job Opportunity
        </label>
        <select
          value={selectedJobId || ""}
          onChange={(e) => {
            setSelectedJobId(e.target.value || null);
            setPrediction(null);
            setShowComparison(false);
          }}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a job opportunity...</option>
          {activeJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} at {job.company}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <Icon icon="mingcute:alert-circle-line" className="text-red-600 mt-0.5" width={20} />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {showComparison && comparisonPredictions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Prediction Comparison</h3>
            <button
              onClick={() => {
                setShowComparison(false);
                setComparisonPredictions([]);
              }}
              className="text-slate-600 hover:text-slate-900"
            >
              <Icon icon="mingcute:close-line" width={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonPredictions.map((comp) => {
              const prediction = comp.prediction || comp;
              const probability = prediction.predictedSuccessProbability ?? prediction.predictedSuccessProbability ?? 0;
              const confidence = prediction.confidenceScore ?? prediction.confidenceScore ?? 0;
              
              return (
                <div
                  key={comp.jobOpportunityId || comp.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <h4 className="font-semibold text-slate-900 mb-1">
                    {comp.jobTitle || "Unknown Position"}
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    {comp.company || "Unknown Company"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-3xl font-bold ${getProbabilityColor(probability)}`}
                    >
                      {Math.round(probability)}%
                    </div>
                    <div className="text-xs text-slate-600">
                      Confidence: {Math.round(confidence)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prediction View */}
      {selectedJobId && !showComparison && (
        <div className="space-y-6">
          {isLoading && !prediction ? (
            <div className="flex items-center justify-center py-12">
              <Icon
                icon="mingcute:loading-line"
                className="animate-spin text-blue-600"
                width={48}
              />
            </div>
          ) : !prediction ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Icon icon="mingcute:chart-line" className="text-slate-400 mx-auto mb-4" width={64} />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Prediction Available
              </h3>
              <p className="text-slate-600 mb-6">
                Calculate your interview success probability to see detailed insights and
                recommendations.
              </p>
              <button
                onClick={() => calculatePrediction(selectedJobId)}
                disabled={isCalculating}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto transition-all"
              >
                {isCalculating ? (
                  <>
                    <Icon
                      icon="mingcute:loading-line"
                      className="animate-spin"
                      width={20}
                    />
                    Calculating...
                  </>
                ) : (
                  <>Calculate Prediction</>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Main Prediction Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {selectedJob?.title} at {selectedJob?.company}
                    </h3>
                    <p className="text-sm text-slate-600">Interview Success Probability</p>
                  </div>
                  <button
                    onClick={() => calculatePrediction(selectedJobId)}
                    disabled={isCalculating}
                    className="px-3 py-1.5 text-sm bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:refresh-line" width={16} />
                    Recalculate
                  </button>
                </div>
                <div className="flex items-end gap-6">
                  <div>
                    <div
                      className={`text-6xl font-bold ${getProbabilityColor(
                        prediction.predictedSuccessProbability
                      )}`}
                    >
                      {Math.round(prediction.predictedSuccessProbability)}%
                    </div>
                    <p className="text-sm text-slate-600 mt-1">Success Probability</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Confidence</span>
                      <span className="text-sm font-medium text-slate-900">
                        {Math.round(prediction.confidenceScore)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${prediction.confidenceScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Factor Scores */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Factor Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(prediction.factorsBreakdown).map(([key, factor]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border ${getScoreBgColor(factor.score)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span
                          className={`text-lg font-bold ${getScoreColor(factor.score)}`}
                        >
                          {Math.round(factor.score)}%
                        </span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-1.5 mb-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            factor.score >= 80
                              ? "bg-green-600"
                              : factor.score >= 60
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600">
                        Weight: {Math.round(factor.weight * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Recommendations to Improve
                  </h3>
                  <div className="space-y-3">
                    {prediction.recommendations.map((rec: Recommendation) => (
                      <div
                        key={rec.id}
                        className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div
                              className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                                rec.priority
                              )}`}
                            >
                              {rec.priority.toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{rec.title}</h4>
                              <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">
                              +{rec.impact}% impact
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcome Tracking */}
              {prediction.actualOutcome && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Outcome</h3>
                  <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
                      {prediction.actualOutcome.charAt(0).toUpperCase() +
                        prediction.actualOutcome.slice(1)}
                    </div>
                    {prediction.predictionAccuracy !== undefined && (
                      <div className="text-sm text-slate-600">
                        Prediction Accuracy:{" "}
                        <span className="font-medium">
                          {Math.abs(prediction.predictionAccuracy).toFixed(1)}% off
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedJobId && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Icon icon="mingcute:chart-line" className="text-slate-400 mx-auto mb-4" width={64} />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Select a Job Opportunity
          </h3>
          <p className="text-slate-600">
            Choose a job opportunity from the dropdown above to view or calculate your interview
            success prediction.
          </p>
        </div>
      )}
    </div>
  );
}

