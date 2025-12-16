import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../../services/api";

interface CareerPathSimulationProps {
  selectedOffers: string[];
  offers: any[];
  onClose: () => void;
}

export function CareerPathSimulation({
  selectedOffers,
  offers,
  onClose,
}: CareerPathSimulationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState({
    priority: "career growth",
    workLifeBalance: "moderate",
    learningOpportunities: "high",
    leadershipAspirations: "yes",
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"5year" | "10year">("5year");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOffers.length > 0) {
      loadSimulations();
    }
  }, [selectedOffers]);

  const loadSimulations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (selectedOffers.length === 1) {
        // Single offer simulation
        const response = await api.generateCareerSimulation(
          selectedOffers[0],
          userPreferences
        );
        if (response.success && response.data) {
          setSimulationData({
            single: response.data,
            type: "single",
          });
          setSelectedOfferId(selectedOffers[0]);
        }
      } else {
        // Multiple offer comparison
        const response = await api.compareCareerPaths(
          selectedOffers,
          userPreferences
        );
        if (response.success && response.data) {
          setSimulationData({
            comparison: response.data,
            type: "comparison",
          });
          if (response.data.offers && response.data.offers.length > 0) {
            setSelectedOfferId(response.data.offers[0].offerId);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading simulations:", err);
      setError(err.message || "Failed to load career simulations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = () => {
    setShowPreferencesModal(false);
    loadSimulations();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return (rate * 100).toFixed(1) + "%";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Icon
            icon="mingcute:loading-line"
            className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4"
          />
          <p className="text-slate-600">
            Analyzing career trajectories and generating simulations...
          </p>
          <p className="text-sm text-slate-500 mt-2">
            This may take a moment as we consult AI for insights
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Icon icon="mingcute:alert-line" className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Simulations</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadSimulations}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!simulationData) {
    return (
      <div className="text-center py-12">
        <Icon icon="mingcute:chart-line-line" className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">No simulation data available</p>
      </div>
    );
  }

  const renderOfferDetails = (data: any) => {
    const activeSimulation =
      activeTab === "5year" ? data.simulations.fiveYear : data.simulations.tenYear;

    return (
      <div className="space-y-6">
        {/* Header with offer info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {data.offer.company}
              </h3>
              <p className="text-lg text-slate-700">{data.offer.position}</p>
              <p className="text-sm text-slate-600 mt-2">
                <Icon icon="mingcute:location-line" className="w-4 h-4 inline mr-1" />
                {data.offer.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Starting Salary</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(data.offer.baseSalary)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("5year")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "5year"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            5-Year Simulation
          </button>
          <button
            onClick={() => setActiveTab("10year")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "10year"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            10-Year Simulation
          </button>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Expected Final Salary</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(activeSimulation.summary.expectedFinalSalary)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(activeSimulation.summary.expectedTotalEarnings)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Expected Final Title</p>
            <p className="text-lg font-semibold text-slate-900">
              {activeSimulation.summary.expectedFinalTitle}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Annual Growth Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatPercentage(activeSimulation.summary.careerGrowthRate)}
            </p>
          </div>
        </div>

        {/* Career progression timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Icon icon="mingcute:timeline-line" className="w-5 h-5 text-blue-500" />
            Career Progression Timeline
          </h4>
          <div className="space-y-4">
            {activeSimulation.milestones.map((milestone: any, index: number) => (
              <div
                key={index}
                className={`flex items-start gap-4 pb-4 ${
                  index < activeSimulation.milestones.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Year {milestone.yearOffset}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                        {milestone.title}
                        {milestone.titleChanged && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            <Icon icon="mingcute:arrow-up-line" className="w-3 h-3" />
                            Promoted
                          </span>
                        )}
                      </h5>
                      {milestone.events && milestone.events.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {milestone.events.map((event: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <Icon icon="mingcute:check-line" className="w-4 h-4 text-green-500" />
                              {event}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(milestone.salary)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Total: {formatCurrency(milestone.totalCompensation)}
                      </p>
                      {milestone.growthRate > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          +{formatPercentage(milestone.growthRate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Probability distributions */}
        {activeSimulation.probabilities && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:chart-bar-line" className="w-5 h-5 text-purple-500" />
              Outcome Scenarios
            </h4>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-green-900">
                      Best Case (15% probability)
                    </h5>
                    <p className="text-sm text-green-700 mt-1">
                      {activeSimulation.probabilities.bestCase.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(activeSimulation.probabilities.bestCase.finalSalary)}
                    </p>
                    <p className="text-sm text-green-700">
                      Total: {formatCurrency(activeSimulation.probabilities.bestCase.totalEarnings)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-blue-900">
                      Average Case (70% probability)
                    </h5>
                    <p className="text-sm text-blue-700 mt-1">
                      {activeSimulation.probabilities.averageCase.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(activeSimulation.probabilities.averageCase.finalSalary)}
                    </p>
                    <p className="text-sm text-blue-700">
                      Total: {formatCurrency(activeSimulation.probabilities.averageCase.totalEarnings)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-amber-900">
                      Worst Case (15% probability)
                    </h5>
                    <p className="text-sm text-amber-700 mt-1">
                      {activeSimulation.probabilities.worstCase.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(activeSimulation.probabilities.worstCase.finalSalary)}
                    </p>
                    <p className="text-sm text-amber-700">
                      Total: {formatCurrency(activeSimulation.probabilities.worstCase.totalEarnings)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        {activeSimulation.aiInsights && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:sparkles-line" className="w-5 h-5 text-purple-500" />
              AI-Powered Career Insights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSimulation.aiInsights.opportunities && (
                <div>
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:light-bulb-line" className="w-4 h-4 text-green-500" />
                    Opportunities
                  </h5>
                  <ul className="space-y-2">
                    {activeSimulation.aiInsights.opportunities.map((opp: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <Icon icon="mingcute:check-line" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSimulation.aiInsights.challenges && (
                <div>
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:alert-line" className="w-4 h-4 text-amber-500" />
                    Challenges
                  </h5>
                  <ul className="space-y-2">
                    {activeSimulation.aiInsights.challenges.map((challenge: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <Icon icon="mingcute:arrow-right-line" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSimulation.aiInsights.keySkills && (
                <div>
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:star-line" className="w-4 h-4 text-blue-500" />
                    Key Skills to Develop
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {activeSimulation.aiInsights.keySkills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeSimulation.aiInsights.recommendations && (
                <div>
                  <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icon icon="mingcute:bulb-line" className="w-4 h-4 text-purple-500" />
                    Recommendations
                  </h5>
                  <ul className="space-y-2">
                    {activeSimulation.aiInsights.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <Icon icon="mingcute:check-line" className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lifetime earnings projection */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Icon icon="mingcute:currency-dollar-2-line" className="w-5 h-5 text-green-500" />
            Lifetime Earnings Projection
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">5-Year Total</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(data.lifetimeEarnings.fiveYearTotal)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">10-Year Total</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.lifetimeEarnings.tenYearTotal)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">30-Year Projection</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.lifetimeEarnings.thirtyYearProjection)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            {data.lifetimeEarnings.assumptions}
          </p>
        </div>

        {/* Decision points */}
        {data.decisionPoints && data.decisionPoints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:fork-line" className="w-5 h-5 text-orange-500" />
              Critical Decision Points
            </h4>
            <div className="space-y-6">
              {data.decisionPoints.map((point: any, idx: number) => (
                <div key={idx} className="border-l-4 border-orange-400 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-semibold text-slate-900">{point.title}</h5>
                      <p className="text-sm text-slate-600">{point.yearRange}</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {point.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{point.description}</p>
                  <div className="space-y-3">
                    {point.options.map((option: any, optIdx: number) => (
                      <div key={optIdx} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <h6 className="font-medium text-slate-900">{option.choice}</h6>
                          <span className="text-sm font-semibold text-green-600">
                            {option.salaryImpact}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{option.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:star-line" className="w-5 h-5 text-green-500" />
              Strategic Recommendations
            </h4>
            <div className="space-y-4">
              {data.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        rec.priority === "high"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon icon="mingcute:light-bulb-line" className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="font-semibold text-slate-900">{rec.title}</h5>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{rec.description}</p>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2">
                        <strong>Action:</strong> {rec.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSingleOfferSimulation = () => {
    const data = simulationData.single;
    return renderOfferDetails(data);
  };

  const renderComparisonView = () => {
    const comparison = simulationData.comparison;
    const selectedOffer = comparison.offers.find(
      (o: any) => o.offerId === selectedOfferId
    );

    return (
      <div className="space-y-6">
        {/* Comparison insights */}
        {comparison.comparisonInsights && comparison.comparisonInsights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Icon icon="mingcute:trophy-line" className="w-6 h-6 text-yellow-500" />
              Career Path Comparison Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparison.comparisonInsights.map((insight: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {insight.type === "highest_lifetime_earnings" && (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:currency-dollar-line" className="w-6 h-6 text-green-600" />
                        </div>
                      )}
                      {insight.type === "fastest_growth" && (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:rocket-line" className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      {insight.type === "earnings_spread" && (
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Icon icon="mingcute:chart-line-line" className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-lg font-bold text-blue-600 mb-1">{insight.value}</p>
                      {insight.company && (
                        <p className="text-sm font-medium text-slate-700">{insight.company}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rankings */}
        {comparison.rankings && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Career Outcome Rankings
            </h3>
            <div className="space-y-3">
              {comparison.rankings.map((ranking: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    ranking.offerId === selectedOfferId
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedOfferId(ranking.offerId)}
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      idx === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : idx === 1
                        ? "bg-gray-100 text-gray-700"
                        : idx === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ranking.rank}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">
                      {ranking.company} - {ranking.position}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                      <span>Growth: {ranking.growthRate}</span>
                      <span>10Y: {formatCurrency(ranking.tenYearEarnings)}</span>
                      <span>30Y: {formatCurrency(ranking.lifetimeEarnings)}</span>
                    </div>
                  </div>
                  <Icon
                    icon="mingcute:arrow-right-line"
                    className="w-6 h-6 text-slate-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected offer details */}
        {selectedOffer && (
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Detailed Simulation: {selectedOffer.offer.company}
            </h3>
            {renderOfferDetails(selectedOffer)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Icon icon="mingcute:chart-line-line" className="w-7 h-7 text-blue-500" />
            Career Path Simulation
          </h2>
          <p className="text-slate-600 mt-1">
            Long-term career trajectory analysis for selected offers
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
          >
            <Icon icon="mingcute:settings-3-line" className="w-5 h-5" />
            Preferences
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            <Icon icon="mingcute:arrow-left-line" className="w-5 h-5 inline mr-2" />
            Back
          </button>
        </div>
      </div>

      {/* Main content */}
      {simulationData.type === "single"
        ? renderSingleOfferSimulation()
        : renderComparisonView()}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Career Preferences</h3>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Career Priority
                </label>
                <select
                  value={userPreferences.priority}
                  onChange={(e) =>
                    setUserPreferences({ ...userPreferences, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="career growth">Career Growth</option>
                  <option value="work-life balance">Work-Life Balance</option>
                  <option value="compensation">Compensation</option>
                  <option value="learning">Learning & Development</option>
                  <option value="impact">Impact & Influence</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work-Life Balance Importance
                </label>
                <select
                  value={userPreferences.workLifeBalance}
                  onChange={(e) =>
                    setUserPreferences({
                      ...userPreferences,
                      workLifeBalance: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Learning Opportunities
                </label>
                <select
                  value={userPreferences.learningOpportunities}
                  onChange={(e) =>
                    setUserPreferences({
                      ...userPreferences,
                      learningOpportunities: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Leadership Aspirations
                </label>
                <select
                  value={userPreferences.leadershipAspirations}
                  onChange={(e) =>
                    setUserPreferences({
                      ...userPreferences,
                      leadershipAspirations: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="no">No - Individual Contributor Track</option>
                  <option value="maybe">Maybe - Open to Opportunities</option>
                  <option value="yes">Yes - Active Interest</option>
                  <option value="strong">Strong - Primary Goal</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePreferences}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Update & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
