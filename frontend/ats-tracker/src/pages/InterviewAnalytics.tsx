import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { InterviewAnalytics } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export function InterviewAnalytics() {
  const [analytics, setAnalytics] = useState<InterviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getInterviewAnalytics();
      if (response.ok && response.data) {
        setAnalytics(response.data);
      } else {
        setError("Failed to load analytics data");
      }
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {error || "Failed to load analytics data"}
            </p>
            <button
              onClick={fetchAnalytics}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const formatChartData = analytics.performanceByFormat.map((item) => ({
    name: item.formatLabel,
    successful: item.successful,
    total: item.total,
  }));

  const companyTypeChartData = analytics.performanceByCompanyType.map(
    (item) => ({
      name: item.companyType,
      successful: item.successful,
      total: item.total,
    })
  );

  const skillAreaChartData = analytics.skillAreaPerformance.map((item) => ({
    name: item.skillAreaLabel,
    score: item.averageScore,
    remaining: 100 - item.averageScore,
  }));

  const trendChartData = analytics.improvementTrend
    .filter((item) => item.period && item.averageScore !== null)
    .map((item) => ({
      period: item.period,
      score: item.averageScore || 0,
    }));

  // Confidence trend data
  const confidenceChartData = analytics.confidenceTrends
    ? analytics.confidenceTrends
        .filter((item) => item.period && item.avgPreConfidence !== null)
        .map((item) => ({
          period: item.period,
          confidence: item.avgPreConfidence || 0,
        }))
    : [];

  // Anxiety trend data
  const anxietyChartData = analytics.anxietyProgress
    ? analytics.anxietyProgress
        .filter((item) => item.period && item.avgPreAnxiety !== null)
        .map((item) => ({
          period: item.period,
          anxiety: item.avgPreAnxiety || 0,
        }))
    : [];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Performance Analytics
          </h1>
          <p className="text-gray-600">
            Track your progress and identify patterns
          </p>
        </div>

        {/* Top Row: Conversion Rate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interview to Offer Conversion Rate */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Interview to Offer Conversion Rate
            </h3>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {analytics.conversionRate.userRate}%
            </div>
            <p className="text-sm text-gray-500">Your Score</p>
          </div>

          {/* Industry Standards */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Industry Standards
            </h3>
            <div className="space-y-2">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.conversionRate.userRate}%
                </div>
                <p className="text-xs text-gray-500">Your Score</p>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="text-2xl font-bold text-gray-700">
                  {analytics.conversionRate.industryAverage}%
                </div>
                <p className="text-xs text-gray-500">Industry Standards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Format Comparison and Company Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Interview Format Comparison */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Interview Format Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" fill="#F97316" name="Successful Interviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Across Company Types */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Across Company Types
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" fill="#3B82F6" name="Successful Interviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Skill Areas and Improvement Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strongest & Weakest Areas */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Strongest & Weakest Areas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={skillAreaChartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="score" fill="#3B82F6" name="Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Improvements Over Time */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Improvements Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#F97316"
                  fill="#F97316"
                  fillOpacity={0.3}
                  name="Average Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3: Confidence and Anxiety Trends */}
        {(analytics.confidenceTrends || analytics.anxietyProgress) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confidence Trends */}
            {analytics.confidenceTrends && confidenceChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confidence Levels Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={confidenceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="confidence"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                      name="Confidence Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-sm text-gray-500 mt-2">
                  Track your confidence levels before interviews (0-100 scale)
                </p>
              </div>
            )}

            {/* Anxiety Progress */}
            {analytics.anxietyProgress && anxietyChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Anxiety Management Progress
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={anxietyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="anxiety"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.3}
                      name="Anxiety Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-sm text-gray-500 mt-2">
                  Monitor anxiety levels before interviews (0-100 scale, lower is better)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Practice vs Real Comparison */}
        {analytics.practiceVsRealComparison && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Practice vs Real Interview Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Practice Interviews */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Practice Interviews</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Conversion Rate: </span>
                    <span className="font-bold text-gray-900">
                      {analytics.practiceVsRealComparison.practice.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Completed: </span>
                    <span className="font-medium text-gray-900">
                      {analytics.practiceVsRealComparison.practice.completed}
                    </span>
                  </div>
                  {analytics.practiceVsRealComparison.practice.avgScore && (
                    <div>
                      <span className="text-sm text-gray-600">Avg Score: </span>
                      <span className="font-medium text-gray-900">
                        {analytics.practiceVsRealComparison.practice.avgScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Real Interviews */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">Real Interviews</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Conversion Rate: </span>
                    <span className="font-bold text-blue-600">
                      {analytics.practiceVsRealComparison.real.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Completed: </span>
                    <span className="font-medium text-gray-900">
                      {analytics.practiceVsRealComparison.real.completed}
                    </span>
                  </div>
                  {analytics.practiceVsRealComparison.real.avgScore && (
                    <div>
                      <span className="text-sm text-gray-600">Avg Score: </span>
                      <span className="font-medium text-gray-900">
                        {analytics.practiceVsRealComparison.real.avgScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {analytics.practiceVsRealComparison.improvement !== 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {analytics.practiceVsRealComparison.improvement > 0 ? "✅" : "📉"}{" "}
                  {analytics.practiceVsRealComparison.improvement > 0
                    ? `You're performing ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% better in real interviews than practice!`
                    : `Your real interview conversion rate is ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% lower than practice.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Row: Recommendations and Strategy Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personalized Improvement Recommendations */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Personalized Improvement Recommendations
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Recommended Actions ({analytics.recommendations.length}):
            </p>
            <ul className="space-y-3">
              {analytics.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Optimal Interview Strategy Insights */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Optimal Interview Strategy Insights
            </h3>
            <ol className="space-y-4">
              {analytics.optimalStrategyInsights.map((insight) => (
                <li key={insight.number} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                    {insight.number}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

