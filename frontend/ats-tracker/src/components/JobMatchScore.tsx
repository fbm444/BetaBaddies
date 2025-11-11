import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { JobOpportunityData, MatchScore } from "../types";
import { api } from "../services/api";

interface JobMatchScoreProps {
  opportunity: JobOpportunityData;
  onScoreUpdate?: (score: MatchScore) => void;
}

export function JobMatchScore({
  opportunity,
  onScoreUpdate,
}: JobMatchScoreProps) {
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadMatchScore();
  }, [opportunity.id]);

  const loadMatchScore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getMatchScore(opportunity.id);
      if (response.ok && response.data && response.data.matchScore) {
        setMatchScore(response.data.matchScore);
        if (onScoreUpdate) {
          onScoreUpdate(response.data.matchScore);
        }
      } else {
        // No match score exists yet - don't calculate automatically
        setMatchScore(null);
      }
    } catch (err: any) {
      console.error("Error loading match score:", err);
      // Don't set error - just show "Calculate" button
      setMatchScore(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMatchScore = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.calculateMatchScore(opportunity.id);
      if (response.ok && response.data) {
        setMatchScore(response.data.matchScore);
        if (onScoreUpdate) {
          onScoreUpdate(response.data.matchScore);
        }
      } else {
        throw new Error(response.error?.message || "Failed to calculate match score");
      }
    } catch (err: any) {
      console.error("Error calculating match score:", err);
      setError(err.message || "Failed to calculate match score");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading && !matchScore) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Job Match Score
        </h3>
        <p className="text-slate-500">Calculating match score...</p>
      </section>
    );
  }

  if (error && !matchScore) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Job Match Score
        </h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={calculateMatchScore}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!matchScore) {
    return (
      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Job Match Score
        </h3>
        <button
          onClick={calculateMatchScore}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Calculate Match Score
        </button>
      </section>
    );
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Job Match Score</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={calculateMatchScore}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <Icon icon="mingcute:refresh-line" width={16} className="inline mr-1" />
            Recalculate
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-full ${getScoreColor(
              matchScore.overallScore
            )} flex items-center justify-center text-2xl font-bold`}
          >
            {matchScore.overallScore}%
          </div>
          <div className="flex-1">
            <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full ${getScoreBgColor(
                  matchScore.overallScore
                )}`}
                style={{ width: `${matchScore.overallScore}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {matchScore.overallScore >= 80
                ? "Strong Match"
                : matchScore.overallScore >= 60
                ? "Moderate Match"
                : "Weak Match"}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mb-4">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <span>Match Breakdown</span>
          <Icon
            icon={showBreakdown ? "mingcute:up-line" : "mingcute:down-line"}
            width={16}
          />
        </button>

        {showBreakdown && (
          <div className="mt-3 space-y-4">
            {/* Skills Match */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">Skills</span>
                <span className="text-sm font-semibold text-slate-700">
                  {matchScore.breakdown.skills.score}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${matchScore.breakdown.skills.score}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {matchScore.breakdown.skills.matchedCount} of{" "}
                {matchScore.breakdown.skills.totalRequired} skills matched (
                {matchScore.breakdown.skills.matchPercentage}%)
              </p>
              {matchScore.breakdown.skills.missing.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Missing: {matchScore.breakdown.skills.missing.slice(0, 3).map((s) => s.name).join(", ")}
                  {matchScore.breakdown.skills.missing.length > 3 && "..."}
                </p>
              )}
            </div>

            {/* Experience Match */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">Experience</span>
                <span className="text-sm font-semibold text-slate-700">
                  {matchScore.breakdown.experience.score}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${matchScore.breakdown.experience.score}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {matchScore.breakdown.experience.totalYears} years experience
                {matchScore.breakdown.experience.requiredYears
                  ? ` (${matchScore.breakdown.experience.requiredYears} required)`
                  : ""}
              </p>
              <p className="text-xs text-slate-600">
                Level: {matchScore.breakdown.experience.userExpLevel} (
                {matchScore.breakdown.experience.requiredLevel} required)
              </p>
            </div>

            {/* Education Match */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">Education</span>
                <span className="text-sm font-semibold text-slate-700">
                  {matchScore.breakdown.education.score}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${matchScore.breakdown.education.score}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {matchScore.breakdown.education.userHighestLevel}
                {matchScore.breakdown.education.requiredLevel !== "Not specified"
                  ? ` (${matchScore.breakdown.education.requiredLevel} required)`
                  : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Strengths */}
      {matchScore.strengths && matchScore.strengths.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            Strengths
          </h4>
          <ul className="space-y-2">
            {matchScore.strengths.map((strength, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <Icon
                  icon="mingcute:check-circle-line"
                  width={16}
                  className="text-green-600 mt-0.5 flex-shrink-0"
                />
                <span>{strength.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {matchScore.gaps && matchScore.gaps.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Gaps</h4>
          <ul className="space-y-2">
            {matchScore.gaps.map((gap, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <Icon
                  icon="mingcute:alert-circle-line"
                  width={16}
                  className="text-yellow-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <span>{gap.description}</span>
                  {gap.items.length > 0 && (
                    <ul className="mt-1 ml-4 list-disc text-xs text-slate-600">
                      {gap.items.slice(0, 3).map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {matchScore.suggestions && matchScore.suggestions.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-700 hover:text-slate-900 mb-2"
          >
            <span>Improvement Suggestions</span>
            <Icon
              icon={showSuggestions ? "mingcute:up-line" : "mingcute:down-line"}
              width={16}
            />
          </button>

          {showSuggestions && (
            <ul className="space-y-2">
              {matchScore.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-slate-700 bg-blue-50 p-3 rounded-lg"
                >
                  <Icon
                    icon="mingcute:lightbulb-line"
                    width={16}
                    className="text-blue-600 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <span className="font-medium">{suggestion.category}:</span>{" "}
                    <span>{suggestion.suggestion}</span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs ${
                        suggestion.priority === "High"
                          ? "bg-red-100 text-red-800"
                          : suggestion.priority === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {suggestion.priority}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Calculated At */}
      <p className="text-xs text-slate-500 mt-4">
        Last calculated:{" "}
        {new Date(matchScore.calculatedAt).toLocaleString()}
      </p>
    </section>
  );
}

