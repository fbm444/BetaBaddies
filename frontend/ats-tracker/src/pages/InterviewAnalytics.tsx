import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { ROUTES } from "../config/routes";
import type { InterviewAnalytics } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type TabType = "schedule" | "preparation" | "reminders" | "thank-you" | "follow-ups" | "calendar" | "analytics";

export function InterviewAnalytics() {
  const navigate = useNavigate();
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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "schedule", label: "Schedule", icon: "mingcute:calendar-line" },
    { id: "preparation", label: "Preparation", icon: "mingcute:bulb-line" },
    { id: "reminders", label: "Reminders", icon: "mingcute:clipboard-line" },
    { id: "thank-you", label: "Thank You Notes", icon: "mingcute:mail-line" },
    { id: "follow-ups", label: "Follow-ups", icon: "mingcute:task-line" },
    { id: "calendar", label: "Calendar", icon: "mingcute:calendar-2-line" },
    { id: "analytics", label: "Analytics", icon: "mingcute:chart-bar-line" },
  ];

  const handleTabClick = (tabId: TabType) => {
    if (tabId === "analytics") {
      return; // Already on analytics page
    }
    // Navigate back to interviews page with the selected tab
    navigate(`${ROUTES.INTERVIEWS}?tab=${tabId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white font-poppins">
        <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Interviews
            </h1>
            <p className="text-slate-600">
              View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-8">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative pb-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 bg-transparent ${
                    tab.id === "analytics"
                      ? "text-blue-500"
                      : "text-slate-600"
                  }`}
                  style={{ 
                    fontFamily: 'Poppins',
                    outline: 'none', 
                    boxShadow: 'none', 
                    border: 'none',
                    borderRadius: '0px',
                    borderTopLeftRadius: '0px',
                    borderTopRightRadius: '0px',
                    borderBottomLeftRadius: '0px',
                    borderBottomRightRadius: '0px'
                  }}
                  onFocus={(e) => e.target.blur()}
                >
                  <Icon icon={tab.icon} width={18} />
                  {tab.label}
                  {tab.id === "analytics" && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      style={{ height: '2px', borderRadius: '0px' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          <div className="text-center py-12">
            <Icon icon="mingcute:loading-line" className="animate-spin text-blue-500 mx-auto mb-4" width={32} />
            <p className="text-slate-600" style={{ fontFamily: 'Poppins' }}>Loading analytics...</p>
        </div>
        </main>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-white font-poppins">
        <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Interviews
            </h1>
            <p className="text-slate-600">
              View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-8">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative pb-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 bg-transparent ${
                    tab.id === "analytics"
                      ? "text-blue-500"
                      : "text-slate-600"
                  }`}
                  style={{ 
                    fontFamily: 'Poppins',
                    outline: 'none', 
                    boxShadow: 'none', 
                    border: 'none',
                    borderRadius: '0px',
                    borderTopLeftRadius: '0px',
                    borderTopRightRadius: '0px',
                    borderBottomLeftRadius: '0px',
                    borderBottomRightRadius: '0px'
                  }}
                  onFocus={(e) => e.target.blur()}
                >
                  <Icon icon={tab.icon} width={18} />
                  {tab.label}
                  {tab.id === "analytics" && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      style={{ height: '2px', borderRadius: '0px' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error State */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800 mb-4" style={{ fontFamily: 'Poppins' }}>
              {error || "Failed to load analytics data"}
            </p>
            <button
              onClick={fetchAnalytics}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              style={{ fontFamily: 'Poppins' }}
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Prepare chart data with abbreviated labels
  const abbreviateFormatLabel = (label: string) => {
    const labelLower = label.toLowerCase();
    if (labelLower.includes('system design')) return 'Sys Design';
    if (labelLower.includes('phone')) return 'Phone';
    if (labelLower.includes('hirevue')) return 'HireVue';
    if (labelLower.includes('technical')) return 'Technical';
    if (labelLower.includes('behavioral')) return 'Behavioral';
    if (labelLower.includes('on-site') || labelLower.includes('onsite')) return 'On-site';
    return label.length > 8 ? label.substring(0, 8) : label;
  };

  const formatChartData = analytics.performanceByFormat.map((item) => ({
    name: abbreviateFormatLabel(item.formatLabel),
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
    <div className="min-h-screen bg-white font-poppins">
      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Poppins' }}>
            Interviews
          </h1>
          <p className="text-slate-600">
            View and manage your interviews. Schedule new interviews, view upcoming ones, and access all interview details.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative pb-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 bg-transparent ${
                  tab.id === "analytics"
                    ? "text-blue-500"
                    : "text-slate-600"
                }`}
                style={{ 
                  outline: 'none', 
                  boxShadow: 'none', 
                  border: 'none',
                  borderRadius: '0px',
                  borderTopLeftRadius: '0px',
                  borderTopRightRadius: '0px',
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px'
                }}
                onFocus={(e) => e.target.blur()}
              >
                <Icon icon={tab.icon} width={18} />
                {tab.label}
                {tab.id === "analytics" && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    style={{ height: '2px', borderRadius: '0px' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Analytics */}
        <div className="mt-8 bg-slate-50 -mx-6 lg:-mx-10 px-6 lg:px-10 py-10 rounded-t-2xl">
          {/* Main Content Container with Light Blue Background */}
          <div className="bg-[#EBF5FF] rounded-t-[30px] border border-[#B7B7B7] p-8">
            {/* Single Grid Layout with Strategy Insights spanning all rows */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.8fr_350px] gap-6 auto-rows-min">
              {/* Left Column: Stacked Cards (Conversion Rate, Industry Standards, Company Types) */}
              <div className="space-y-6">
                {/* Top Row: Small Conversion Rate Cards */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Interview to Offer Conversion Rate - Smaller */}
                  <div className="rounded-[15px] p-3 flex flex-col justify-between" style={{ background: 'linear-gradient(180deg, #1E3097 0%, #3351FD 100%)', minHeight: '170px' }}>
                    <h3 className="text-[16px] font-medium text-white mb-1" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
              Interview to Offer Conversion Rate
            </h3>
                    <div className="text-[50px] font-medium text-[#E7EFFF]" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
              {analytics.conversionRate.userRate}%
            </div>
          </div>

                  {/* Industry Standards - Smaller */}
                  <div className="bg-white rounded-[15px] p-3 flex flex-col justify-between" style={{ minHeight: '170px' }}>
                    <h3 className="text-[16px] font-light text-black mb-1" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
              Industry Standards
            </h3>
                    <div className="flex items-end gap-3">
              <div className="flex-shrink-0">
                        <div className="text-[36px] font-medium" style={{ color: '#3351FD', fontFamily: 'Poppins', fontWeight: 500 }}>
                  {analytics.conversionRate.userRate}%
                </div>
                        <p className="text-[11px]" style={{ color: '#737373', fontFamily: 'Poppins' }}>Your Score</p>
              </div>
                      <div className="flex-shrink-0">
                        <div className="text-[36px]" style={{ color: '#9A9A9A', fontFamily: 'Poppins', fontWeight: 100 }}>
                  {analytics.conversionRate.industryAverage}%
                </div>
                        <p className="text-[11px] whitespace-nowrap" style={{ color: '#737373', fontFamily: 'Poppins' }}>Industry Standards</p>
              </div>
            </div>
          </div>
        </div>

                {/* Performance Across Company Types - Spans both cards above, matches height with Format Comparison + Strongest/Weakest */}
                <div className="bg-white rounded-[15px] p-3" style={{ minHeight: '370px' }}>
                  <h3 className="text-[25px] font-light text-black mb-4" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
              Performance Across Company Types
            </h3>
                  <ResponsiveContainer width="100%" height={280}>
              <BarChart data={companyTypeChartData} margin={{ left: 10, right: 10 }}>
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3351FD" />
                          <stop offset="100%" stopColor="#1E3097" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                      />
                      <YAxis 
                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                        domain={[0, 30]}
                        label={{ value: 'Successful Interviews', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                      />
                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                      <Bar 
                        dataKey="successful" 
                        name="Successful Interviews"
                        radius={[15, 15, 0, 0]}
                        fill="url(#blueGradient)"
                      />
              </BarChart>
            </ResponsiveContainer>
          </div>
              </div>

              {/* Middle Column: Format Comparison and Strongest & Weakest Areas */}
              <div className="flex flex-col gap-6">
                {/* Interview Format Comparison */}
                <div className="bg-white rounded-[15px] p-3" style={{ minHeight: '310px' }}>
                  <h3 className="text-[20px] font-light text-black mb-6" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                    Interview Format Comparison
                  </h3>
                  <ResponsiveContainer width="100%" height={224}>
                    <BarChart data={formatChartData} margin={{ left: 10, right: 10, bottom: 30 }}>
                      <defs>
                        <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFD53F" />
                          <stop offset="100%" stopColor="#F89000" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                      <XAxis 
                        dataKey="name" 
                        angle={-15}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fill: '#737373', fontSize: 10, fontFamily: 'Poppins', fontWeight: 400 }}
                      />
                      <YAxis 
                        tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                        domain={[0, 30]}
                        label={{ value: 'Successful Interviews', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                      />
                      <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                      <Bar 
                        dataKey="successful" 
                        name="Successful Interviews"
                        radius={[15, 15, 0, 0]}
                        fill="url(#orangeGradient)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Strongest & Weakest Areas - Should align with Company Types card */}
                <div className="bg-white rounded-[15px] p-4 flex flex-col" style={{ paddingBottom: '21px', minHeight: '230px' }}>
                  <h3 className="text-[18px] font-light text-black mb-5" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                    Strongest & Weakest Areas
                  </h3>
                  <div className="space-y-6">
                    {/* Render existing skill areas with data - limit to 3 */}
                    {skillAreaChartData.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-black" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
                            {item.name}
                          </span>
                          <span className="text-[10px]" style={{ color: '#606060', fontFamily: 'Poppins', fontWeight: 400 }}>
                            {item.score}/100
                          </span>
                        </div>
                        <div className="relative w-full h-[8px] rounded-[10px]" style={{ background: '#D9D9D9' }}>
                          <div 
                            className="h-[8px] rounded-[10px]" 
                            style={{ 
                              width: `${item.score}%`,
                              background: 'linear-gradient(90deg, #1E3097 0%, #3351FD 100%)'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Optimal Interview Strategy Insights - Spanning first 2 rows only */}
              <div className="bg-white rounded-[15px] p-6 flex flex-col" style={{ gridRow: 'span 2', minHeight: '600px' }}>
                <h3 className="text-[25px] font-light text-black mb-6" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                  Optimal Interview Strategy Insights
                </h3>
                <div className="space-y-8 flex-1 flex flex-col justify-between">
                  {analytics.optimalStrategyInsights.map((insight, idx) => (
                    <div key={insight.number} className="flex-1 flex flex-col justify-center">
                      <div className="flex gap-4">
                        <span className="text-[35px] font-light shrink-0" style={{ color: '#003DB6', fontFamily: 'Poppins', fontWeight: 300 }}>
                          {insight.number}.
                        </span>
                        <div>
                          <h4 className="text-[13px] font-semibold text-black mb-2" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                            {insight.title}
                          </h4>
                          <p className="text-[13px] font-light leading-relaxed" style={{ color: '#737373', fontFamily: 'Poppins', fontWeight: 300 }}>
                            {insight.description}
                          </p>
                        </div>
                      </div>
                      {idx < analytics.optimalStrategyInsights.length - 1 && (
                        <div className="h-[1px] mt-8" style={{ background: '#D9D9D9' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Second Row: Improvements Over Time and Recommendations with custom proportions */}
              <div className="flex gap-6" style={{ gridColumn: '1 / 3' }}>
                {/* Improvements Over Time - Smaller width */}
                <div className="bg-white rounded-[15px] p-3 flex-shrink-0" style={{ width: '38%', minHeight: '270px' }}>
                    <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                      Improvements Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendChartData} margin={{ left: 10, right: 10 }}>
                        <defs>
                          <linearGradient id="orangeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFD53F" />
                            <stop offset="100%" stopColor="#F89000" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                        <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                        <YAxis 
                          tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                          label={{ value: 'Average Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                        />
                        <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="url(#orangeAreaGradient)"
                          fill="url(#orangeAreaGradient)"
                          name="Average Score"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                {/* Recommendations - Extended width */}
                <div className="bg-white rounded-[15px] p-4 flex-1" style={{ minHeight: '270px' }}>
                    <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                      Personalized Improvement <br/>Recommendations
                    </h3>
                    <p className="text-[16px] font-light mb-3" style={{ color: '#6A94EE', fontFamily: 'Poppins', fontWeight: 300 }}>
                    Recommended Actions ({analytics.recommendations.length}):
                  </p>
                  <ul className="space-y-2">
                    {analytics.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-[15px] h-[15px] mt-0.5 flex items-center justify-center" style={{ background: 'transparent' }}>
                            <div className="w-[11.25px] h-[11.25px]" style={{ background: '#09244B' }} />
                          </div>
                          <span className="text-[13px] font-light text-black" style={{ fontFamily: 'Poppins', fontWeight: 275 }}>
                            {rec}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
              </div>

            </div>

            {/* Bottom Row: Confidence, Anxiety, Practice vs Real - Full width under everything */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Confidence Trends */}
              <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '300px' }}>
                <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                  Confidence Levels Over Time
                </h3>
                {analytics.confidenceTrends && confidenceChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={confidenceChartData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                        <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                          label={{ value: 'Confidence Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                        />
                        <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
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
                    <p className="text-sm mt-2" style={{ color: '#737373', fontFamily: 'Poppins' }}>
                      Track your confidence levels before interviews (0-100 scale)
                    </p>
                  </>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center" style={{ color: '#737373' }}>
                        <p style={{ fontFamily: 'Poppins' }}>No confidence data available yet</p>
                      </div>
                    )}
              </div>

              {/* Anxiety Progress */}
              <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '300px' }}>
                <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                  Anxiety Management Progress
                </h3>
                {analytics.anxietyProgress && anxietyChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={anxietyChartData} margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D9D9D9" />
                        <XAxis dataKey="period" tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }} />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 }}
                          label={{ value: 'Anxiety Level', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#737373', fontSize: 12, fontFamily: 'Poppins', fontWeight: 400 } }}
                        />
                        <Tooltip contentStyle={{ fontFamily: 'Poppins' }} />
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
                    <p className="text-sm mt-2" style={{ color: '#737373', fontFamily: 'Poppins' }}>
                      Monitor anxiety levels before interviews (0-100 scale, lower is better)
                    </p>
                  </>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center" style={{ color: '#737373' }}>
                        <p style={{ fontFamily: 'Poppins' }}>No anxiety data available yet</p>
                      </div>
                    )}
              </div>

              {/* Practice vs Real Comparison */}
              <div className="bg-white rounded-[15px] p-4" style={{ minHeight: '280px' }}>
                <h3 className="text-[20px] font-light text-black mb-3" style={{ fontFamily: 'Poppins', fontWeight: 300 }}>
                  Practice vs Real Interview Comparison
                </h3>
                {analytics.practiceVsRealComparison ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Practice Interviews */}
                      <div className="border border-slate-200 rounded-lg p-3">
                        <h4 className="font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins' }}>Practice Interviews</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Conversion Rate: </span>
                            <span className="font-bold text-slate-900" style={{ fontFamily: 'Poppins' }}>
                              {analytics.practiceVsRealComparison.practice.conversionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Completed: </span>
                            <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                              {analytics.practiceVsRealComparison.practice.completed}
                            </span>
                          </div>
                          {analytics.practiceVsRealComparison.practice.avgScore && (
                            <div>
                              <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Avg Score: </span>
                              <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                {analytics.practiceVsRealComparison.practice.avgScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Real Interviews */}
                      <div className="border border-slate-200 rounded-lg p-3">
                        <h4 className="font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins' }}>Real Interviews</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Conversion Rate: </span>
                            <span className="font-bold" style={{ color: '#3351FD', fontFamily: 'Poppins' }}>
                              {analytics.practiceVsRealComparison.real.conversionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Completed: </span>
                            <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                              {analytics.practiceVsRealComparison.real.completed}
                            </span>
                          </div>
                          {analytics.practiceVsRealComparison.real.avgScore && (
                            <div>
                              <span className="text-sm text-slate-600" style={{ fontFamily: 'Poppins' }}>Avg Score: </span>
                              <span className="font-medium text-slate-900" style={{ fontFamily: 'Poppins' }}>
                                {analytics.practiceVsRealComparison.real.avgScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {analytics.practiceVsRealComparison.improvement !== 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800" style={{ fontFamily: 'Poppins' }}>
                          {analytics.practiceVsRealComparison.improvement > 0 ? "✅" : "📉"}{" "}
                          {analytics.practiceVsRealComparison.improvement > 0
                            ? `You're performing ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% better in real interviews than practice!`
                            : `Your real interview conversion rate is ${Math.abs(analytics.practiceVsRealComparison.improvement).toFixed(1)}% lower than practice.`}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8" style={{ color: '#737373' }}>
                    <p style={{ fontFamily: 'Poppins' }}>No practice vs real comparison data available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

