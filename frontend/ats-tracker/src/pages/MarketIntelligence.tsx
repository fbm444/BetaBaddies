import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { marketIntelligenceService, MarketOverview } from '../services/marketIntelligenceService';

interface CompetitiveAnalysis {
  peerBenchmarking: {
    userApplicationsPerWeek: number;
    peerAverage: string;
    topPerformers: string;
    insight: string;
  };
  skillGaps: Array<{
    skill: string;
    importance: string;
    currentLevel: number;
    targetLevel: number;
  }>;
  marketPositioning: {
    competitivenessScore: number;
    level: string;
    strengths: string[];
    insights: string[];
  };
  differentiation: {
    uniqueValueProposition: string;
    competitiveAdvantages: string[];
  };
  recommendations: {
    quickWins: string[];
    strategicMoves: string[];
    longTermEdge: string[];
  };
  successPatterns: {
    avgTimeToOffer: string;
    nextCareerStep: string;
    typicalProgression: string;
  };
}

export function MarketIntelligence() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<CompetitiveAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState('Initializing...');

  useEffect(() => {
    fetchMarketOverview();
    handleGenerateCompetitiveAnalysis();
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

  const handleGenerateCompetitiveAnalysis = async () => {
    try {
      const messages = [
        'Gathering your profile data...',
        'Analyzing your skills and experience...',
        'Comparing with industry benchmarks...',
        'Consulting AI for competitive insights...',
        'Identifying skill gaps and opportunities...',
        'Generating personalized recommendations...',
        'Finalizing competitive analysis...',
      ];
      
      let messageIndex = 0;
      setAnalysisProgress(messages[0]);
      
      // Update progress message every 2 seconds
      const progressTimer = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setAnalysisProgress(messages[messageIndex]);
      }, 2000);

      const response = await fetch('/api/v1/competitive-analysis', {
        method: 'GET',
        credentials: 'include',
      });
      
      clearInterval(progressTimer);
      
      const data = await response.json();
      if (data.ok && data.data?.analysis) {
        setAnalysisProgress('Complete!');
        setCompetitiveAnalysis(data.data.analysis);
      } else {
        setError('Failed to generate competitive analysis');
      }
    } catch (err: any) {
      console.error('Error generating competitive analysis:', err);
      setError('Failed to generate competitive analysis. Please try refreshing the page.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="mingcute:loading-line" className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-700" />
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
            className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-poppins">Market Intelligence</h2>
              <p className="text-slate-600 font-poppins">
                Data-driven insights to guide your career decisions
              </p>
            </div>
            <button
              onClick={handleRefreshCache}
              disabled={refreshingCache}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-600 disabled:text-blue-300 disabled:cursor-not-allowed transition-colors bg-transparent"
              title="Refresh market data from Adzuna"
            >
              <Icon 
                icon="mingcute:refresh-2-line" 
                width={20}
                className={refreshingCache ? 'animate-spin' : ''} 
              />
              <span>{refreshingCache ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
          <div className="text-sm text-slate-500">
            <strong>Your Profile:</strong> {overview.profile.jobTitle} • {overview.profile.industry} • {overview.profile.location || 'Remote'}
          </div>
        </div>

        {/* Content with gray background */}
        <div className="bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-8">
            {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Your Market Salary */}
          <div className="bg-white rounded-lg border border-slate-300 p-6">
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Industry Growth</span>
              <Icon icon="mingcute:chart-up-line" className="w-6 h-6 text-blue-700" />
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
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
        <div className="bg-white rounded-lg border border-slate-300 p-6">
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:building-line" className="w-5 h-5 text-blue-700" />
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
          <div className="bg-white rounded-lg border border-slate-300 p-6">
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
        <div className="bg-white rounded-lg border border-slate-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Personalized Insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">AI-powered recommendations for your career</p>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={generatingInsights}
              className="px-4 py-2 bg-gradient-to-r from-[#845BFF] to-[#F551A2] text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingInsights ? (
                <>
                  <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon icon="mingcute:sparkles-line" className="w-5 h-5" />
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

        {/* AI-Powered Competitive Analysis */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mingcute:sparkles-line" className="w-7 h-7 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Competitive Analysis</h2>
          </div>
          
          <p className="text-sm text-gray-700 mb-6">
            Understand your competitive position in the job market compared to similar professionals
          </p>

          {!competitiveAnalysis ? (
            <div className="text-center py-12">
              <Icon icon="mingcute:loading-line" className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Generating AI-powered competitive analysis...
              </p>
              <p className="text-sm text-purple-600 mb-4">
                {analysisProgress}
              </p>
              <div className="max-w-md mx-auto bg-purple-50 rounded-lg p-4 mt-6">
                <p className="text-xs text-gray-600">
                  <Icon icon="mingcute:information-line" className="w-4 h-4 inline mr-1" />
                  This typically takes 10-15 seconds as we analyze your profile with AI
                </p>
              </div>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Peer Benchmarking */}
            <div className="bg-white rounded-lg p-5 border border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mingcute:group-line" className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Peer Benchmarking</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Your Applications/Week</span>
                  <span className="font-semibold text-gray-900">
                    {competitiveAnalysis.peerBenchmarking.userApplicationsPerWeek}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Peer Average</span>
                  <span className="font-semibold text-blue-600">{competitiveAnalysis.peerBenchmarking.peerAverage}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Top Performers</span>
                  <span className="font-semibold text-green-600">{competitiveAnalysis.peerBenchmarking.topPerformers}</span>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-900">
                    <Icon icon="mingcute:lightbulb-line" className="w-4 h-4 inline mr-1" />
                    {competitiveAnalysis.peerBenchmarking.insight}
                  </p>
                </div>
              </div>
            </div>

            {/* Skill Gap vs Top Performers */}
            <div className="bg-white rounded-lg p-5 border border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mingcute:chart-bar-line" className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Skill Gap Analysis</h3>
              </div>
              <div className="space-y-3">
                {competitiveAnalysis.skillGaps.slice(0, 3).map((skillGap, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="font-medium text-gray-700">{skillGap.skill}</span>
                      <span className="text-xs text-gray-500">{skillGap.importance}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(skillGap.currentLevel / skillGap.targetLevel) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-900">
                    <Icon icon="mingcute:trophy-line" className="w-4 h-4 inline mr-1" />
                    Adding these skills could place you in the top 25% of candidates.
                  </p>
                </div>
              </div>
            </div>

            {/* Market Positioning */}
            <div className="bg-white rounded-lg p-5 border border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mingcute:target-line" className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Competitive Position</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Market Competitiveness</span>
                    <span className={`text-sm font-semibold ${
                      competitiveAnalysis.marketPositioning.level === 'Strong' ? 'text-green-600' :
                      competitiveAnalysis.marketPositioning.level === 'Moderate' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>{competitiveAnalysis.marketPositioning.level}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full ${
                      competitiveAnalysis.marketPositioning.competitivenessScore > 70 ? 'bg-green-500' :
                      competitiveAnalysis.marketPositioning.competitivenessScore > 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} style={{ width: `${competitiveAnalysis.marketPositioning.competitivenessScore}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {competitiveAnalysis.marketPositioning.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Icon icon="mingcute:check-circle-fill" className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  ))}
                  {competitiveAnalysis.marketPositioning.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Icon icon="mingcute:information-fill" className="w-4 h-4 text-blue-700 mt-0.5" />
                      <span className="text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Differentiation Strategy */}
            <div className="bg-white rounded-lg p-5 border border-slate-300">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mingcute:star-line" className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Differentiation Strategy</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                  <p className="font-semibold text-amber-900 mb-1">Unique Value Proposition</p>
                  <p className="text-amber-800">
                    {competitiveAnalysis.differentiation.uniqueValueProposition}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-2">Competitive Advantages:</p>
                  <ul className="space-y-1 ml-4">
                    {competitiveAnalysis.differentiation.competitiveAdvantages.map((advantage, idx) => (
                      <li key={idx} className="text-gray-600">• {advantage}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg p-5 border border-slate-300">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="mingcute:magic-line" className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI-Powered Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mingcute:rocket-line" className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">Quick Wins</span>
                </div>
                <ul className="text-sm text-purple-800 space-y-1">
                  {competitiveAnalysis.recommendations.quickWins.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mingcute:compass-line" className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Strategic Moves</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  {competitiveAnalysis.recommendations.strategicMoves.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mingcute:trophy-line" className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Long-term Edge</span>
                </div>
                <ul className="text-sm text-green-800 space-y-1">
                  {competitiveAnalysis.recommendations.longTermEdge.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Success Pattern Analysis */}
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="mingcute:chart-line-line" className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Success Pattern Analysis</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Based on successful career progressions in {overview.profile.industry}:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Icon icon="mingcute:time-line" className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Average Time to Offer</p>
                  <p className="text-gray-600">Similar professionals: <strong>{competitiveAnalysis.successPatterns.avgTimeToOffer}</strong></p>
                  <p className="text-xs text-gray-500 mt-1">{competitiveAnalysis.successPatterns.typicalProgression}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mingcute:footprint-line" className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Common Career Path</p>
                  <p className="text-gray-600">Next step: <strong>{competitiveAnalysis.successPatterns.nextCareerStep}</strong></p>
                  <p className="text-xs text-gray-500 mt-1">Based on career progression patterns</p>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

