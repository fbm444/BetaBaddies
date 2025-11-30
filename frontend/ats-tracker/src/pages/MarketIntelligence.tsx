import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { marketIntelligenceService, MarketOverview } from '../services/marketIntelligenceService';

export function MarketIntelligence() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);

  useEffect(() => {
    fetchMarketOverview();
  }, []);

  const fetchMarketOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketIntelligenceService.getMarketOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Error fetching market overview:', err);
      setError(err.response?.data?.error || 'Failed to load market intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setGeneratingInsights(true);
      await marketIntelligenceService.generateInsights();
      // Refresh overview to get new insights
      await fetchMarketOverview();
    } catch (err: any) {
      console.error('Error generating insights:', err);
      setError(err.response?.data?.error || 'Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleUpdateInsightStatus = async (insightId: string, status: 'dismissed' | 'completed') => {
    try {
      await marketIntelligenceService.updateInsightStatus(insightId, status);
      // Refresh overview
      await fetchMarketOverview();
    } catch (err: any) {
      console.error('Error updating insight:', err);
    }
  };

  const handleRefreshCache = async () => {
    try {
      setRefreshingCache(true);
      await marketIntelligenceService.refreshCache();
      // Refresh overview to get new data
      await fetchMarketOverview();
    } catch (err: any) {
      console.error('Error refreshing cache:', err);
      setError(err.response?.data?.error || 'Failed to refresh market data');
    } finally {
      setRefreshingCache(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading market intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Icon icon="mingcute:warning-line" className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMarketOverview}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const salaryData = overview.salaryIntelligence;
  const trends = overview.industryTrends;
  const skillData = overview.skillDemand;
  const insights = overview.personalizedInsights;
  const highPriorityInsights = insights.filter(i => i.priority === 'high');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Icon icon="mingcute:chart-line-line" className="w-8 h-8 text-blue-500" />
              Market Intelligence
            </h1>
            <p className="text-gray-600 mt-2">
              Data-driven insights to guide your career decisions
            </p>
            <div className="mt-2 text-sm text-gray-500">
              <strong>Your Profile:</strong> {overview.profile.jobTitle} • {overview.profile.industry} • {overview.profile.location || 'Remote'}
            </div>
          </div>
          <button
            onClick={handleRefreshCache}
            disabled={refreshingCache}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed flex items-center gap-2 border border-gray-300"
            title="Refresh market data from Adzuna"
          >
            <Icon 
              icon="mingcute:refresh-line" 
              className={`w-5 h-5 ${refreshingCache ? 'animate-spin' : ''}`} 
            />
            {refreshingCache ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Your Market Salary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Your Market Salary</span>
              <Icon icon="mingcute:currency-dollar-line" className="w-6 h-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${(salaryData.yourMarket.average / 1000).toFixed(0)}k
            </div>
            {salaryData.comparison && (
              <div className={`text-sm mt-1 ${
                salaryData.comparison.positioning === 'above_market' ? 'text-green-600' :
                salaryData.comparison.positioning === 'below_market' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {salaryData.comparison.percentDifference}% vs national
              </div>
            )}
          </div>

          {/* Industry Growth */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Industry Growth</span>
              <Icon icon="mingcute:chart-up-line" className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {trends.growthMetrics.growthRate > 0 ? '+' : ''}
              {trends.growthMetrics.growthRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {trends.growthMetrics.recentJobs.toLocaleString()} recent jobs
            </div>
          </div>

          {/* Hiring Velocity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Hiring Velocity</span>
              <Icon icon="mingcute:time-line" className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {trends.hiringActivity.hiringVelocity.replace('_', ' ')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {trends.hiringActivity.avgJobAge.toFixed(0)} days avg
            </div>
          </div>

          {/* National Benchmark */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">National Median</span>
              <Icon icon="mingcute:bank-line" className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${((salaryData.nationalBenchmark?.median || 0) / 1000).toFixed(0)}k
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {salaryData.nationalBenchmark?.source?.split('(')[0] || 'N/A'}
            </div>
          </div>
        </div>

        {/* High Priority Insights */}
        {highPriorityInsights.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:alert-line" className="w-6 h-6 text-red-500" />
              High Priority Actions
            </h2>
            <div className="space-y-4">
              {highPriorityInsights.map((insight) => (
                <div key={insight.id} className="border-l-4 border-red-500 pl-4 pr-4 py-2 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{insight.description}</p>
                      {insight.actionable_items && insight.actionable_items.length > 0 && (
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600">
                          {insight.actionable_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleUpdateInsightStatus(insight.id, 'completed')}
                        className="p-2 text-green-600 hover:bg-green-100 rounded"
                        title="Mark as completed"
                      >
                        <Icon icon="mingcute:check-line" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleUpdateInsightStatus(insight.id, 'dismissed')}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Dismiss"
                      >
                        <Icon icon="mingcute:close-line" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salary Intelligence */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Icon icon="mingcute:currency-dollar-line" className="w-6 h-6 text-green-500" />
            Salary Intelligence
          </h2>
          
          {/* Comparison Insight */}
          {salaryData.comparison && (
            <div className={`p-4 rounded-lg mb-6 ${
              salaryData.comparison.positioning === 'above_market' ? 'bg-green-50 border border-green-200' :
              salaryData.comparison.positioning === 'below_market' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className="font-semibold mb-2">Market Positioning</h4>
              <p className="text-sm">{salaryData.comparison.insight}</p>
            </div>
          )}

          {/* Salary Distribution */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Salary Distribution</h4>
            {salaryData.salaryDistribution ? (
              <>
                <p className="text-sm text-gray-500 mb-4">{salaryData.salaryDistribution.source}</p>
                <div className="grid grid-cols-5 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">10th</div>
                    <div className="text-sm font-semibold">${(salaryData.salaryDistribution.p10 || salaryData.salaryDistribution.min || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">25th</div>
                    <div className="text-sm font-semibold">${(salaryData.salaryDistribution.p25 || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">Median</div>
                    <div className="text-sm font-semibold text-blue-600">${(salaryData.salaryDistribution.median || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">75th</div>
                    <div className="text-sm font-semibold">${(salaryData.salaryDistribution.p75 || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">90th</div>
                    <div className="text-sm font-semibold">${(salaryData.salaryDistribution.p90 || salaryData.salaryDistribution.max || 0).toLocaleString()}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Distribution data unavailable</div>
            )}
          </div>
        </div>

        {/* Top Hiring Companies & Skills Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Hiring Companies */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:building-line" className="w-5 h-5 text-blue-500" />
              Top Hiring Companies
            </h3>
            <div className="space-y-3">
              {trends.topCompanies.slice(0, 10).map((company: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium">{idx + 1}.</span>
                    <span className="text-gray-900 font-medium">{company.company}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{company.jobCount} jobs</div>
                    {company.avgSalary && (
                      <div className="text-xs text-gray-500">${(company.avgSalary / 1000).toFixed(0)}k avg</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Skills */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:star-line" className="w-5 h-5 text-yellow-500" />
              Most In-Demand Skills
            </h3>
            <div className="space-y-3">
              {skillData.topSkills.slice(0, 10).map((skill: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium">{idx + 1}.</span>
                    <span className="text-gray-900 font-medium">{skill.skillName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{skill.demandCount.toLocaleString()} jobs</div>
                    <div className="text-xs text-gray-500">{skill.percentageOfJobs}% of jobs</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Insights */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon icon="mingcute:lightbulb-line" className="w-6 h-6 text-yellow-500" />
                Personalized Insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">AI-powered recommendations for your career</p>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={generatingInsights}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingInsights ? (
                <>
                  <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:magic-line" className="w-5 h-5" />
                  Generate Insights
                </>
              )}
            </button>
          </div>

          {insights.length === 0 ? (
            <div className="text-center py-12">
              <Icon icon="mingcute:inbox-line" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No insights yet. Generate your first insights!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.filter(i => i.priority !== 'high').map((insight) => {
                const priorityColors = {
                  high: 'border-red-500 bg-red-50',
                  medium: 'border-yellow-500 bg-yellow-50',
                  low: 'border-blue-500 bg-blue-50',
                };
                const priorityIcons = {
                  high: 'mingcute:alert-line',
                  medium: 'mingcute:information-line',
                  low: 'mingcute:lightbulb-line',
                };

                return (
                  <div
                    key={insight.id}
                    className={`border-l-4 p-4 rounded-r-lg ${priorityColors[insight.priority]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon icon={priorityIcons[insight.priority]} className="w-5 h-5" />
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-white capitalize">
                            {insight.priority} Priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                        
                        {insight.actionable_items && insight.actionable_items.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {insight.actionable_items.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleUpdateInsightStatus(insight.id, 'completed')}
                          className="p-2 text-green-600 hover:bg-green-100 rounded"
                          title="Mark as completed"
                        >
                          <Icon icon="mingcute:check-line" className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUpdateInsightStatus(insight.id, 'dismissed')}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Dismiss"
                        >
                          <Icon icon="mingcute:close-line" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

